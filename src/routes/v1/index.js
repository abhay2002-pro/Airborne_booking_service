const express = require("express");

const { InfoController } = require("../../controllers");
const BookingController = require("./booking");

const router = express.Router();

router.get("/info", InfoController.info);

router.use("/bookings", BookingController);

module.exports = router;
