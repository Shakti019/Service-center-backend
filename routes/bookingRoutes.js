const express=require('express');
const router=express.Router();

const {
    CreateBooking,
    getAllbookings,
    updateBooking,
    getSingleBooking,
    getBookingByPhone,
    completeBooking,
    deleteBooking,
    checkBookingStatus
}=require("../Controllers/bookingController");

// Create a new booking
router.post('/',CreateBooking);

// Get all bookings
router.get('/all',getAllbookings);

// Get single booking by ID
router.get('/:id',getSingleBooking);

// Get booking by phone number
router.get('/phone/:phone',getBookingByPhone);

// Check booking status
router.get('/status/:id', checkBookingStatus);

// Update booking (assign technician)
router.put('/:id',updateBooking);

// Complete booking
router.put('/complete/:id',completeBooking);

// Delete booking
router.delete('/:id',deleteBooking);

module.exports=router;