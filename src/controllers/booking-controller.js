const { StatusCodes } = require('http-status-codes')
const { BookingService } = require('../services')
const { SuccessResponse, ErrorResponse } = require('../utils/common')
const inMemDB = {};

async function createBooking(req, res) {
    try {
        const booking = await BookingService.createBooking({
            flightId: req.body.flightId,
            userId: req.body.userId,
            noOfSeats: req.body.noOfSeats 
        });
        SuccessResponse.data = booking
        return res
                .status(StatusCodes.ACCEPTED)
                .json(SuccessResponse)
    } catch(error) {
        ErrorResponse.error = error;
        return res
                .status(error.statusCode)
                .json(ErrorResponse)
    }
}

async function makePayment(req, res) {
    try {
        const idempotencyKey = req.headers['x-idempotency-key'];
        if(!idempotencyKey){
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Idempotency key missing!'
            })
        }
        if(inMemDB[idempotencyKey]){
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: 'Cannot retry on a succesful payment'
            })
        }
        const response = await BookingService.makePayment({
            totalCost: req.body.totalCost,
            userId: req.body.userId,
            bookingId: req.body.bookingId 
        });
        inMemDB[idempotencyKey] = idempotencyKey
        SuccessResponse.data = response
        return res
                .status(StatusCodes.ACCEPTED)
                .json(SuccessResponse)
    } catch(error) {
        ErrorResponse.error = error;
        return res
                .status(error.statusCode)
                .json(ErrorResponse)
    }
}

module.exports = {
    createBooking,
    makePayment
}