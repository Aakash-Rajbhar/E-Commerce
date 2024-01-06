const port = 4000;
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { log } = require("console");
const bcrypt = require("bcrypt");
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

//mongodb+srv://theskyrajbhar:<password>@cluster0.xiwkwr6.mongodb.net/

//Database connection with mongodb

//function to connect to database
async function dbConnect() {
  try {
    await mongoose.connect(
      `mongodb+srv://theskyrajbhar:${process.env.DB_PASSWORD}@cluster0.xiwkwr6.mongodb.net/e-commerce`
    );

    console.log("Database connected");
  } catch (err) {
    console.error(err);
  }
}
dbConnect();

// API creation

app.get("/", (req, res) => {
  res.send(`Server is running on http://localhost:${port}`);
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//Creating upload endpoint for images
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//Schema for creating products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  try {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
      let last_product_array = products.slice(-1);
      let last_product = last_product_array[0];
      id = last_product.id + 1;
    } else {
      id = 1;
    }
    const product = new Product({
      id: id,
      name: req.body.name,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      image: req.body.image,
    });
    // console.log(product);
    await product.save();
    console.log("Product Saved");
    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.log(error.message);
  }
});

//Creating API for deleting products
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Product Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//Creating API for getting all products

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
//   console.log("All Products Fetched");
  res.send(products);
});

// Schema Creating for user model
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// middleware for encrypting the password before saving it in db
userSchema.pre("save", async function () {
  let salt = await bcrypt.genSalt();
  let hashedPassword = await bcrypt.hash(this.password, salt);
//   console.log(hashedPassword);
  this.password = hashedPassword;
});

//Creating  user model
const Users = mongoose.model("Users", userSchema);

// Creating Endpoint for registering the user
app.post("/signup", async (req, res) => {
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({
        success: false,
        error: "Existing User Found with same email address!!",
      });
    }

    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: cart,
    });

    await user.save();

    const data = {
      user: {
        id: user.id,
      },
    };

    const token = jwt.sign(data, "secretEcom");
    res.json({ success: true, token });
  } catch (error) {
    console.log("Error in sign up ", error);
    res.json({
      success: false,
      error: error.message,
    });
  }
});

// Creating Endpoint for user login

app.post("/login", async (req, res) => {
  const user = await Users.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({
      success: false,
      error: "User not found! Wrong Email",
    });
  } else {
    try {
      const passCompare = await bcrypt.compare(req.body.password, user.password);
      // const passCompare = req.body.password === user.password;
      if (passCompare) {
        // console.log("Password Matched");
        // console.log(`Welcome ${user.username}`);
        const data = {
          user: {
            id: user.id,
          },
        };
        const token = jwt.sign(data, "secretEcom");
        res.json({ success: true, token });
      } else {
        res.json({ success: false, error: "Wrong Password!" });
      }
    } catch (error) {
        console.log("Login Error : ", error.message);
    }
  }
});

//Creating endpoint new-collection data

app.get("/newcollections", async (req, res) => {
  try {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    // console.log("new collection fetched");
    res.send(newcollection);
  } catch (error) {
    console.log("Error in getting the new collections ", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// creating endpoint for popular in women section

app.get("/populerinwomen", async (req, res) => {
  try {
    let products = await Product.find({ category: "women" });
    let populerInWomen = products.slice(0, 4);
    // console.log("popular in women fetched");
    res.send(populerInWomen);
  } catch (error) {
    console.log("Error in getting the popular in Women ", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

//creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({
      error: "Please authenticate using valid token!",
    });
  } else {
    try {
      const data = jwt.verify(token, "secretEcom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({
        error: "Please authenticate using valid token!",
      });
    }
  }
};

// creating endpoint for saving cart products

app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// creating endpoint to remove product from cartData

app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("Removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

// creating endpoint to get cartdata

app.post("/getcart", fetchUser, async (req, res) => {
//   console.log("GetCart");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

app.listen(port, (error) => {
  if (!error) {
    console.log(`Server is running on ${port}`);
  } else {
    console.log(`Error : ${error}`);
  }
});
