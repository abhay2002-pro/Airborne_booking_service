const axios =  require('axios');
const StatusCodes = require('http-status-codes');

const { BookingRepository } = require('../repositories')
const { ServerConfig } = require('../config')
const db = require('../models');
const AppError = require('../utils/errors/app-error');
const ENUMS = require('../utils/common/enums')
const { BOOKED, CANCELLED } = ENUMS.BOOKING_STATUS;

const bookingRepository = new BookingRepository();

async function createBooking(data) {
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`)
        const flightData = flight.data.data;
        if(data.noOfSeats > flightData.totalSeats) {
            throw new AppError('Required number of seats not available', StatusCodes.BAD_REQUEST);
        }

        const totalBillingAmount = data.noOfSeats * flightData.price;
        const bookingPayload = {...data, totalCost: totalBillingAmount};
        
        const booking = await bookingRepository.createBooking(bookingPayload, transaction);

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`, {
            seats: data.noOfSeats
        });

        await transaction.commit();
        return booking;
    } catch(error) {
        await transaction.rollback();
        throw error
    }
}

async function makePayment(data) {
    const transaction = await db.sequelize.transaction();
    try {
      const bookingDetails = await bookingRepository.get(data.bookingId, transaction);
    
      if(bookingDetails.status === CANCELLED){
        throw new AppError(`Booking has been cancelled`, StatusCodes.BAD_REQUEST);
      }

      const bookingTime = new Date(bookingDetails.createdAt);
      const currentTime = new Date();
      if(currentTime - bookingTime > 30000){
        await bookingRepository.update(data.bookingId, {status: CANCELLED}, transaction);
        throw new AppError(`The booking has expired`, StatusCodes.BAD_REQUEST);
      }

      if(bookingDetails.totalCost != data.totalCost) {
        throw new AppError(`Amount of payment doesn't match`, StatusCodes.BAD_REQUEST);
      }

      if(bookingDetails.userId != data.userId) {
        throw new AppError(`User corresponding to the booking doesn't match`, StatusCodes.BAD_REQUEST);
      }

      // we are assuming payment is sucessfull
      const response = await bookingRepository.update(data.bookingId, {status: BOOKED}, transaction);
      await transaction.commit()
      return response
    } catch (error) {
        await transaction.rollback()
        throw error
    } 
}
module.exports = {
    createBooking,
    makePayment
}