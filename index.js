const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User } = require('./models/models');
const axios = require('axios');
const cron = require('node-cron');
const nodemailer = require('nodemailer');


// Initialize dotenv to use variables from .env file
dotenv.config();

// Initialize express application
const app = express();
app.use(express.json()); 

// MongoDB connection function
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
};

connectDB();


// POST route to store user details
app.post('/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).send(newUser);
    } catch (error) {
        res.status(400).send(error);
    }
});

// PUT route to update a user's location
app.put('/users/:userId/location', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { location: req.body.location }, { new: true });
        if (!user) {
            return res.status(404).send();
        }
        res.send(user);
    } catch (error) {
        res.status(400).send(error);
    }
});

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

// GET route to retrieve user's weather data for a given day
app.get('/users/:userId/weather', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${user.location}&appid=${apiKey}&units=metric`);

        const newWeatherData = {
            date: new Date(),
            weather: response.data
        };
        user.weatherData.push(newWeatherData);
        await user.save();

        // Format the weather data before sending the response
        const formattedWeather = formatWeatherData(response.data);
        res.send(formattedWeather); // Send the formatted weather data as the response
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASSWORD 
    }
});

// Function to send email
const sendEmail = async (to, subject, text) => {
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
};

module.exports = app;


// Cron Job
// cron.schedule('* * * * *', async () => {
//     cron.schedule('0 */3 * * *', async() => { 
//     console.log('Running a task every 3 hours to update weather data and send reports');

//     try {
//         const users = await User.find({});

//         for (const user of users) {
//             try {
//                 const apiKey = process.env.OPENWEATHERMAP_API_KEY;
//                 const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${user.location}&appid=${apiKey}&units=metric`);

//                 const weatherData = {
//                     date: new Date(),
//                     weather: response.data
//                 };

//                 user.weatherData.push(weatherData);
//                 await user.save();


//                 const emailText = formatWeatherData(weatherData.weather);
//                 await sendEmail(user.email, 'Hourly Weather Report', emailText);

//             } catch (error) {
//                 console.error(`Failed for user ${user._id}:`, error);
//             }
//         }
//     } catch (error) {
//         console.error('Cron job failed:', error);
//     }
// });