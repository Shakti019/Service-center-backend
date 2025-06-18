const Booking= require('../models/Booking');
const WebSocket = require('ws');

// Function to format phone number to E.164 format
const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If number starts with 91, remove it
    if (cleaned.startsWith('91')) {
        cleaned = cleaned.substring(2);
    }
    
    // If number starts with 0, remove it
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Ensure the number is 10 digits
    if (cleaned.length !== 10) {
        throw new Error('Phone number must be 10 digits');
    }
    
    // Add +91 prefix
    return `+91${cleaned}`;
};

exports.CreateBooking= async (req,res)=>{
    try{
        const {customerName, phone, applianceType, description}=req.body;
        
        // Check only for pending bookings
        const existingPendingBooking = await Booking.findOne({ 
            phone: phone,
            status: 'pending'
        });

        if (existingPendingBooking) {
            return res.status(400).json({
                message: "You already have a pending booking. Please wait for it to be processed."
            });
        }

        const countdownEndsAt= new Date(Date.now()+10*60*1000);
        const newBooking=new Booking({
            customerName,
            phone,
            applianceType,
            description,
            countdownEndsAt
        });
        await newBooking.save();
        if (global.io) {
            global.io.emit('newBooking', newBooking);
        }
        res.status(200).json(newBooking);
    }catch(error){
        res.status(500).json({message:error.message});
    }
};

exports.getAllbookings= async (req,res)=>{
    try{
        const booking=await Booking.find().sort({bookingTime:-1});
        res.json(booking);
    }catch(error){
        res.status(500).json({message:error.message});
    }
};

exports.getBookingByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        let formattedPhone;
        
        try {
            // Remove any non-digit characters
            let cleaned = phone.replace(/\D/g, '');
            
            // If number starts with 91, remove it
            if (cleaned.startsWith('91')) {
                cleaned = cleaned.substring(2);
            }
            
            // If number starts with 0, remove it
            if (cleaned.startsWith('0')) {
                cleaned = cleaned.substring(1);
            }
            
            // Ensure the number is 10 digits
            if (cleaned.length !== 10) {
                return res.status(400).json({ 
                    message: "Invalid phone number format. Please provide a 10-digit number." 
                });
            }
            
            // Add +91 prefix
            formattedPhone = `+91${cleaned}`;
            
            console.log('Original phone:', phone);
            console.log('Cleaned phone:', cleaned);
            console.log('Formatted phone:', formattedPhone);
            
        } catch (error) {
            return res.status(400).json({ 
                message: "Invalid phone number format. Please provide a 10-digit number." 
            });
        }
        
        // Get the most recent booking for this phone number
        const booking = await Booking.findOne({ 
            phone: formattedPhone
        }).sort({ bookingTime: -1 });
        
        if (!booking) {
            return res.status(404).json({ 
                message: "No booking found for this phone number",
                phone: formattedPhone
            });
        }
        res.status(200).json(booking);
    } catch (error) {
        console.error('Error in getBookingByPhone:', error);
        res.status(500).json({ 
            message: error.message,
            details: "Error occurred while fetching booking"
        });
    }
};

exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { technicianName, technicianphone } = req.body;
        
        console.log('Received technician details:', { technicianName, technicianphone });
        
        // Format technician phone number
        let formattedTechPhone;
        try {
            // Remove any non-digit characters
            let cleaned = technicianphone.replace(/\D/g, '');
            
            // If number starts with 91, remove it
            if (cleaned.startsWith('91')) {
                cleaned = cleaned.substring(2);
            }
            
            // If number starts with 0, remove it
            if (cleaned.startsWith('0')) {
                cleaned = cleaned.substring(1);
            }
            
            // Ensure the number is 10 digits
            if (cleaned.length !== 10) {
                return res.status(400).json({ 
                    message: "Invalid technician phone number format. Please provide a 10-digit number." 
                });
            }
            
            // Add +91 prefix
            formattedTechPhone = `+91${cleaned}`;
            
            console.log('Formatted technician phone:', formattedTechPhone);
            
        } catch (error) {
            return res.status(400).json({ 
                message: "Invalid technician phone number format. Please provide a 10-digit number." 
            });
        }
        
        // Get the booking details before updating
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const updated = await Booking.findByIdAndUpdate(
            id,
            {
                status: 'accepted',
                technician: {
                    name: technicianName,
                    phonenumber: formattedTechPhone
                }
            },
            { new: true }
        );

        // Emit through Socket.IO
        if (global.io) {
            global.io.emit('bookingUpdate', updated);
        }
        
        console.log('Updated booking:', updated);
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error in updateBooking:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSingleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        res.status(200).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.completeBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { completionMessage, serviceNotes } = req.body;

        console.log('Completing booking:', id);
        console.log('Completion details:', { completionMessage, serviceNotes });

        const booking = await Booking.findById(id);
        if (!booking) {
            console.log('Booking not found:', id);
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status !== 'accepted') {
            return res.status(400).json({ 
                message: "Only accepted bookings can be marked as completed" 
            });
        }

        const updated = await Booking.findByIdAndUpdate(
            id,
            {
                status: 'completed',
                completionDetails: {
                    completedAt: new Date(),
                    completionMessage,
                    serviceNotes
                }
            },
            { new: true }
        );

        if (!updated) {
            throw new Error('Failed to update booking');
        }

        console.log('Booking completed successfully:', updated);
        if (global.io) {
            global.io.emit('bookingUpdate', updated);
        }
        
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error in completeBooking:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Attempting to delete booking:', id);

        const booking = await Booking.findById(id);
        if (!booking) {
            console.log('Booking not found:', id);
            return res.status(404).json({ 
                message: "Booking not found",
                id: id
            });
        }

        const deletedBooking = await Booking.findByIdAndDelete(id);
        console.log('Successfully deleted booking:', deletedBooking);

        if (global.io) {
            global.io.emit('bookingDeleted', deletedBooking);
        }

        res.status(200).json({ 
            message: "Booking deleted successfully",
            deletedBooking: deletedBooking
        });
    } catch (error) {
        console.error('Error in deleteBooking:', error);
        res.status(500).json({ 
            message: "Failed to delete booking",
            error: error.message 
        });
    }
};

const getBookingFromStorage = () => {
    const savedBooking = localStorage.getItem('currentBooking');
    return savedBooking ? JSON.parse(savedBooking) : null;
};

exports.checkBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                message: "Booking ID is required",
                status: 'error'
            });
        }

        // Get the booking with minimal fields needed for status
        const booking = await Booking.findById(id).select('status technician completionDetails countdownEndsAt');
        
        if (!booking) {
            return res.status(404).json({ 
                message: "Booking not found",
                status: 'not_found'
            });
        }

        // Return only the necessary status information
        const statusResponse = {
            status: booking.status,
            technician: booking.technician || null,
            completionDetails: booking.completionDetails || null,
            countdownEndsAt: booking.countdownEndsAt
        };

        console.log('Sending status response:', statusResponse);
        res.status(200).json(statusResponse);
    } catch (error) {
        console.error('Error in checkBookingStatus:', error);
        res.status(500).json({ 
            message: error.message || "Internal server error",
            status: 'error'
        });
    }
};