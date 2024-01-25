const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const connectToDb = require('./connectToDb.js')
const {notFound, errorHandler} = require('./middleware/errorMiddleware.js');
const upload = require('express-fileupload');
const fs = require('fs');

const userRoutes = require('./routes/userRoutes.js');
const postRoutes = require('./routes/postRoutes.js');

dotenv.config();

const app = express();
app.use(express.json({extended: true}))
app.use(express.urlencoded({extended: true}))
app.use(cors())
app.use(upload());
// app.use('/uploads', express.static(__dirname + '/uploads'))

app.use(
    '/uploads',
    (req, res, next) => {
      const filePath = __dirname + '/uploads' + req.url;
  
      // Check if the file exists before serving or unlinking
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res.status(404).send('File not found');
        } else {
          next();
        }
      });
    },
    express.static(__dirname + '/uploads')
);





const PORT = process.env.PORT || 3333;
const url = process.env.MONGO_URL;

connectToDb(url);

app.use('/api/users',userRoutes);
app.use('/api/posts',postRoutes);


  


app.use(notFound);
app.use(errorHandler);

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})