const mongoose = require('mongoose');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { User } = require('../models/models'); 
const dotenv = require('dotenv');

dotenv.config();

// MongoDB connection function
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected successfully for cron job.');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Function to send email
async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

function formatWeatherData(weatherData) {
    const main = weatherData.weather[0].main;
    const description = weatherData.weather[0].description;
    const temp = weatherData.main.temp;
    const feelsLike = weatherData.main.feels_like;
    const humidity = weatherData.main.humidity;
    const windSpeed = weatherData.wind.speed;

    return `Weather Report for ${weatherData.name}, ${weatherData.sys.country}:\n` +
        `Main: ${main} (${description})\n` +
        `Temperature: ${temp}°C (Feels like: ${feelsLike}°C)\n` +
        `Humidity: ${humidity}%\n` +
        `Wind Speed: ${windSpeed} m/s\n`;
}

module.exports = async (req, res) => {
    await connectDB();

    try {
        const users = await User.find({});
        for (const user of users) {
            const apiKey = process.env.OPENWEATHERMAP_API_KEY;
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${user.location}&appid=${apiKey}&units=metric`);

            const weatherData = {
                date: new Date(),
                weather: response.data
            };

            user.weatherData.push(weatherData);
            await user.save();

            const emailText = formatWeatherData(weatherData.weather);
            await sendEmail(user.email, 'Hourly Weather Report', emailText);
        }
        res.send('Weather data updated and emails sent successfully');
    } catch (error) {
        console.error('Error in cron job:', error);
        res.status(500).send('Error in executing cron job');
    }
};
