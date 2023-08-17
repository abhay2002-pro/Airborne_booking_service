const { StatusCodes } = require('http-status-codes')
const { Op } = require("sequelize");
const  { Booking } = require('../models')
const CrudRepository = require('./crud-repository');

const { ENUMS } = require("../utils/common")
const  { CANCELLED, BOOKED } = ENUMS.BOOKING_STATUS;

class BookingRepository extends CrudRepository {
    constructor() {
        super(Booking)
    }

    async createBooking(data, transaction) {
        const response = await this.model.create(data, {transaction: transaction});
        return response;   
    }


    async get(data, transaction) {
        const response = await this.model.findByPk(data, {transaction: transaction});
        if(!response) {
            throw new AppError('Not able to find the resource', StatusCodes.NOT_FOUND)
        }
        return response;
    }

    async update(id, data, transaction) { // data -> object
        const response = await this.model.update(data, {
            where: {
                id: id
            }
        }, {transaction: transaction})
        if(response[0] == 0) {
            throw new AppError('Not able to find the resource', StatusCodes.NOT_FOUND)
        }
        return response;
    }

    async cancelOldBookings(timestamp) {
        const response = await Booking.update({status: CANCELLED},{
            where: {
                [Op.and]: [
                    {
                        createdAt: {
                            [Op.lt]: timestamp
                        }
                    }, 
                    {
                        status: {
                            [Op.ne]: BOOKED
                        }
                    },
                    {
                        status: {
                            [Op.ne]: CANCELLED
                        }
                    }
                ]

            }
        });
        return response;
    }
}

module.exports = BookingRepository;
