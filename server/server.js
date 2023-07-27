require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const https = require('https');
const fs = require('fs');
const nodemailer=require('nodemailer')
const app = express();
const port = 3001;
const crypto=require("crypto")
const cookieParser = require('cookie-parser')
const uuid=require('uuid').v4

app.use(cookieParser())
// setting up the method to send the email

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL,
    pass: process.env.WORD,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
 });
 transporter.verify((err, success) => {
  err
    ? console.log(err)
    : console.log(`=== Server is ready to take messages: ${success} ===`);
 });
//  let mailOptions = {
//   from: "test@gmail.com",
//   to: process.env.EMAIL,
//   subject: "Nodemailer API",
//   text: "Hi from your nodemailer API",
//  };
//  transporter.sendMail(mailOptions, function (err, data) {
//   if (err) {
//     console.log("Error " + err);
//   } else {
//     console.log("Email sent successfully");
//   }
//  });

// allows our client to recieve our cookie
let corsOptions = {
  origin: 'http://localhost:3000',  //front end url
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
}

// corsOptions goes inside of cors
app.use(cors(corsOptions));

app.use(express.json());


const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    ca: [
      fs.readFileSync(process.env.SSL_CA_ROOT_PATH), 
//      fs.readFileSync(process.env.SSL_LETSENCRYPT_CA_PATH)
    ],
    // requestCert: true, 
    // rejectUnauthorized: false 
};

const knex = require('knex')(require('./knexfile.js')['development'])









app.get('/cookietest',(req,res)=>{
  if(req.headers.cookie){
    console.log("cookie found")
    const test= req.headers.cookie.split('=')[1]
    console.log(test.split(";"))
     const usersession=test.split(";")[0]
    
    res.send({success:true})
  }else{
    console.log("cookie not found")
    res.send({success:false})
  }
})

app.get('/users', (req, res) => {
  
    
      knex('user_data')
    .select('*')
    .then(data => res.status(200).send(data))
    .catch(err => res.status(404).send(err))
 
});




// creating the new user and verifying their email

app.post('/users', async (req, res) => {
  let token=crypto.randomBytes(64).toString("hex")
  const link = `${process.env.BASE_URL}/users/confirm/?emailToken=${token}`;
  let mailOptions = {
    from: req.body.email,
    to: process.env.EMAIL,
    subject: "User Verify",
    text: link,
   };
   
   transporter.sendMail(mailOptions, link,function (err, data) {
    

    if (err) {
      console.log("Error " + err);
    } else {
      console.log("Email sent successfully");
    }
   });



  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    console.log(hashedPassword)
    
    const newUser = {
      username: req.body.username,
      hashed_password: hashedPassword,
      email: req.body.email,        
      user_organization: req.body.user_organization,
      distinguished_name: req.body.distinguished_name,
      cac_approved: req.body.cac_approved,
      emailToken:token,
      isVerified:false
    };
    console.log("newuser",newUser)
    knex('user_data')
    .where('username',req.body.username)
    .then(data => {
      console.log("inserting")
      if (data.length > 0) {
        res.status(404).json({userCreated: false, message: `Username: *${req.body.username}* already taken!`});
      } else {
        console.log("isnerting new user")
        knex('user_data')
          .insert(newUser)
          .then(() => {
            // set cookie any user info
            res.status(201).send( {success: req.cookies})
          })
          .catch(err => res.status(501).send(err))
      }
    })
  } 
  catch {
    res.status(500).send();
  }
});

app.post('/users/login', (req, res) => {
  const sessionId= uuid()
  res.cookie( 'session',sessionId,{ 
    
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: 0,
    signed: false,
}
  
  )
  console.log("logging in cookie made")
  
  knex('user_data')
    .select('*')
    .where('username', req.body.username)
    .then(data => {
      if (data.length > 0) {
        bcrypt.compare(req.body.password, data[0].hashed_password)
          .then(found => {
            if (found) {
              let responseObj = {
                userExists: found,
                ...data[0]
              }
              res.send(responseObj);
            } else {
              
              let responseObj = {
                userExists: found
              }
              res.send(responseObj);
            }
          })
          .catch(err => res.status(500).send(err));
      } else {
        // response if user is not found in DB
      }
    })
    .catch(err => res.status(500).send(err))
});


app.put('/users/:id',(req,res)=>{
  
  let {id,username,email,user_organization,distinguished_name,cac_approved,emailToken,isVerified}=req.body
  
  console.log("Patching")
  knex('user_data')
    .where('id',req.body.id)
    .update({emailToken:null,isVerified:true})
    .then((rowCount) => {
      if (rowCount === 0) {
      return res.status(404).json({
          message: 'Item not found',
      });
      }
      res.status(200).json({
      message: 'Item updated successfully',
      });
  })
  .catch((err) =>
      res.status(500).json({
      message: 'An error occurred while updating the item',
      error: err,
      })
  );
})



app.get('/narratives/:id', (req, res) => {
  let { id } = req.params;
  knex.select('*')
    .from('narrative')
    .where(function() {
      this.where({'id_entity': id}).orWhere({'id_event': id})
    })
    .then((data) => res.status(200).json(data))
  })

app.get('/individuals', (req, res) => {
  knex.select('*')
    .from('individual')
    .then((data) => res.status(200).json(data))
})

app.get('/organizations', (req, res) => {
  knex.select('*')
    .from('organization')
    .then((data) => res.status(200).json(data))
})

app.get('/events', (req, res) => {
  knex.select('*')
    .from('event')
    .then((data) => res.status(200).json(data))
})

app.get('/position/:id', (req, res) => {
  let { id } = req.params;
  knex.select('position.id AS position_id', 'organization.name AS org_name', 'organization_type.type AS org_type','individual.name AS individual_name', 'role.title AS role_title', 'responsibilities.name AS responsibilities')
    .from('position')
    .where({'individual_id': id})
    .join('individual', 'position.individual_id', 'individual.id')
    .join('organization', 'position.organization_id', 'organization.id')
    .join('organization_type', 'organization.organization_type_id', 'organization_type.id')
    .join('role', 'position.role_id', 'role.id')
    .join('responsibilities', 'role.responsibilities_id', 'responsibilities.id')
    .then((data) => {
      if (data.length !== 0) {
        res.status(200).json(data)
      } else {
        knex.select('position.id AS position_id', 'individual.name AS individual_name', 'role.title AS role_title', 'responsibilities.name AS responsibilities')
          .from('position')
          .where({'individual_id': id})
          .join('individual', 'position.individual_id', 'individual.id')
          .join('role', 'position.role_id', 'role.id')
          .join('responsibilities', 'role.responsibilities_id', 'responsibilities.id')
          .then(otherData => res.status(200).json(otherData))
      }
    })
})

app.get('/entity/:name', (req, res) => {
  let { name } = req.params
  knex.select('*')
    .from('individual')
    .where({'individual.name': name})
    .then(data => {
      if (data.length !== 0) {
        knex.select('entity.id AS individual_entity_id', 'individual.name', 'individual.location AS individual_location', 'interaction.weight', 
        'interaction.id_entity_1', 'interaction.id_entity_2', 'interaction.id_event', 'event.event_name', 
        'event.location AS event_location', 'event.date AS event_date', 'event_type.type AS event_type', 'user_data.username', 'user_data.user_organization')
          .from('individual')
          .where({'individual.name': name})
          .join('entity', 'individual.id', 'entity.id_individual')
          .join('interaction', function() {
            this 
              .on('interaction.id_entity_1', '=', 'entity.id')
              .orOn('interaction.id_entity_2', '=', 'entity.id')
          })
          .join('event', 'interaction.id_event', 'event.id')
          .join('event_type', 'event.event_type_id', 'event_type.id')
          .join('user_data', 'individual.id_user_data', 'user_data.id')
          .then((data) => res.status(200).json(data))
      } else {
        knex.select('entity.id AS organization_entity_id', 'organization.name', 'organization.location AS organization_location', 'interaction.weight', 
        'interaction.id_entity_1', 'interaction.id_entity_2', 'interaction.id_event', 'event.event_name', 
        'event.location AS event_location', 'event.date AS event_date', 'event_type.type AS event_type', 'user_data.username', 'user_data.user_organization')
          .from('organization')
          .where({'organization.name': name})
          .join('entity', 'organization.id', 'entity.id_organization')
          .join('interaction', function() {
            this 
              .on('id_entity_1', '=', 'entity.id')
              .orOn('id_entity_2', '=', 'entity.id')
          })
          .join('event', 'interaction.id_event', 'event.id')
          .join('event_type', 'event_type_id', 'event_type.id')
          .join('user_data', 'organization.id_user_data', 'user_data.id')
          .then((data) => res.status(200).json(data))
      }
    })
})



https.createServer(options, app).listen(port, () => {
  console.log('HTTPS server running on port 3001');
});