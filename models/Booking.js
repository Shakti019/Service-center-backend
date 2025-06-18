const mongoose=require('mongoose');
const bookingSchema=new mongoose.Schema({
    customerName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true
    },
    applianceType: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed'],
        default: 'pending',
        index: true
    },
    bookingTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    countdownEndsAt: Date,
    technician: {
        name: {
            type: String,
            trim: true
        },
        phonenumber: {
            type: String
        }
    },
    completionDetails: {
        completedAt: Date,
        completionMessage: String,
        serviceNotes: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Add indexes
bookingSchema.index({ status: 1, bookingTime: -1 });
bookingSchema.index({ 'technician.name': 1 });

module.exports=mongoose.model('Booking',bookingSchema);