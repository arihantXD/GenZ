const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const engine = require("ejs-mate");
const session = require("express-session");
const MongoDBStore = require('connect-mongodb-session')(session);
const { v4: uuidv4 } = require('uuid');
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const passport = require("passport")
const LocalStrategy = require("passport-local");
const DOMPurify = require('dompurify');



//models 
const User = require("./models/user");
const Product = require("./models/product");
const Order = require("./models/order");



const dbUrl = process.env.DB_URL || "mongodb://127.0.0.1/GenZ";

const store = new MongoDBStore({
  uri: dbUrl,
  collection: 'GenZ_Sessions',
  touchAfter: 24 * 60 * 60
});

const app = express();
app.use(session({
  secret: 'secret13254',
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: {
    httpOnly: true,
    // secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));


app.use(express.json());
app.use(flash());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, '/public')));
app.engine("ejs", engine);
require('dotenv').config();



app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = User.findById(id);
  done(null, user);
});


passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await User.findOne({ username: username });

    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return done(err);
      }

      if (!result) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    });
  }
));


app.use( async (req, res, next) => {
  res.locals.cart = req.session.cart !== null ? req.session.cart : null;
  res.locals.user = await req.user !== null ? await req.user : null;
  next();
})

mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to Database');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err.message);
  });

function sanitizeUserContent(req, res, next) {

  if (req.body.userContent) {
    req.body.userContent = DOMPurify.sanitize(req.body.userContent);
  }

  if (req.params.userContent) {
    req.params.userContent = DOMPurify.sanitize(req.params.userContent);
  }

  next();
}

async function isNotLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  const orders = await Order.find({ user: req.user._id });
  res.render("user", { user: await req.user, orders: orders, success: req.flash("success") });
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.render("login", { message: req.flash("success"), error: req.flash("error") });
}

function isCartEmpty(req, res, next) {
  if (req.session.cart) {
    if (req.session.cart.length !== 0) {
      return next();
    }
  }
  return res.redirect("/")
}


app.get("/", async (req, res) => {
  const featuredProducts = await Product.find({ featured: "Featured Products" });
  const newArrivals = await Product.find({ featured: "New Arrivals" });
  res.render("home", { featuredProducts, newArrivals })
})


app.get("/genz/signin", (req, res) => {
  res.render("signin")
})

app.get("/genz/get/:id", sanitizeUserContent, async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne({ _id: id });
  const products = await Product.find({});
  res.render("showProduct", { product, products })
})

app.get("/genz/get/:gender/:type", sanitizeUserContent, async (req, res) => {
  const { gender, type } = req.params;
  if (type === "Featured Products" || type === "New Arrivals") {
    const products = await Product.find({ featured: type });
    return res.render("selectProduct", { products, gender, type });
  }
  if (type === "All") {
    const products = await Product.find({ gender: gender });
    return res.render("selectProduct", { products, gender, type });
  }
  const products = await Product.find({ gender: gender, type: type });
  res.render("selectProduct", { products, gender, type });
});



app.post("/genz/addCart", async (req, res) => {

  if (!req.session.cart) {
    req.session.cart = [];
  }
  const product = await Product.findOne({ _id: req.body.pId });
  const name = product.name;
  const price = product.price;
  const img = product.colors[0];
  const size = req.body.size;
  let qty = 1;

  for (let item of req.session.cart) {
    if (item.pId === req.body.pId && item.size === req.body.size) {
      qty = parseInt(item.qty) + 1 >= 6 ? 5 : parseInt(item.qty);
      req.session.cart.splice(req.session.cart.indexOf(item), 1);
    }
  }
  req.session.cart.push({ itemId: uuidv4(), pId: req.body.pId, name: name, size: size, img: img, price: price, qty: qty });
  req.session.save(() => {
    res.json("sent")
  });
})


app.get("/genz/getCart", async (req, res) => {
  res.json(req.session.cart);
})


app.post("/genz/getCart/deleteProd", async (req, res) => {
  for (let product of req.session.cart) {
    if (product.pId === req.body.id) {
      req.session.cart.splice(req.session.cart.indexOf(product), 1);
    }
  }
  res.json({ id: req.body.id });
})


app.post("/genz/getCart/updateCart", async (req, res) => {
  for (let product of req.session.cart) {
    if (product.itemId === req.body.id) {
      product.qty = req.body.qty;
      req.session.save(() => {
        res.json("sent")
      });
    }
  }
})

app.get("/genz/user/login", isNotLoggedIn, async (req, res) => {
  res.render("login", { message: req.flash("success"), error: req.flash("error") });
})


app.post('/genz/user/login', sanitizeUserContent, (req, res, next) => {
  passport.authenticate('local', { keepSessionInfo: true }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      req.flash('error', 'Incorrect username or password, try again!');
      return res.redirect('/genz/user/login');
    }

    req.logIn(user,{ keepSessionInfo: true }, (err) => {
      if (err) {
        return next(err);
      }
      req.flash('success', 'Successfully logged in!');
      return res.redirect('/genz/user/showUser');
    });
  })(req, res, next);
});


app.get("/genz/user/register", isNotLoggedIn, async (req, res) => {
  res.render("register", { message: req.flash("dupKey") });
})

app.post("/genz/user/register", sanitizeUserContent, async (req, res) => {
  const { username, password, name } = req.body;
  const user = await User.findOne({ username: username });
  if (user) {
    req.flash("dupKey", "Email already exists, use different email!");
    res.redirect("/genz/user/register");
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name: name, username: username, password: hashedPassword });
    await user.save();
    req.flash("success", "User successfully registerd, please login!")
    return res.redirect('/genz/user/login');
  } catch (error) {
    return res.send('Error during registration. Please try again later.');
  }
});

app.get("/genz/user/showUser", isLoggedIn, async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.render("user", { user: await req.user, orders: orders, success: req.flash("success") });
})


app.get("/genz/user/logout", isLoggedIn, async (req, res) => {
  req.logout({ keepSessionInfo: true }, (err) => {
    if (err) {
      console.error(err);
    }
    res.redirect("/")
  })
})


app.post("/genz/user/update", sanitizeUserContent, async (req, res) => {
  const user = await req.user;
  const { firstname, lastname, phone, address, country, city, zipcode } = req.body;
  if (firstname === undefined) await User.findOneAndUpdate({ _id: user._id }, { $set: { address: address, country: country, city: city, zipcode: zipcode } });
  else await User.findOneAndUpdate({ _id: user._id }, { $set: { name: firstname, lastname: lastname, phone: phone } });
  res.redirect("/genz/user/showUser");
})


app.get("/genz/order/checkout", isLoggedIn, isCartEmpty, async (req, res) => {
  res.render("checkout", { user: await req.user });
})

app.post("/genz/order/info", isLoggedIn, sanitizeUserContent, async (req, res) => {
  const { firstname, lastname, country, city, address, zipcode, phone } = req.body;
  const user = await User.updateOne({ _id: await req.user._id }, { $set: { name: firstname.trim(), lastname: lastname.trim(), country: country.trim(), city: city.trim(), address: address.trim(), zipcode: zipcode, phone: phone } });
  res.json(user);
})

app.post("/genz/order/confirmed", isLoggedIn, isCartEmpty, async (req, res) => {
  let currentDate = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let formattedDate = `${currentDate.toString().split(' ')[0]} ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()} ${currentDate.getFullYear()}`;
  let totalAmount = 0, totalProduct = 0;
  for (let item of req.session.cart) {
    totalAmount += parseInt(item.price) * parseInt(item.qty);
    totalProduct += parseInt(item.qty);
  }
  const order = new Order({
    user: req.user._id,
    email: req.user.username,
    name: req.user.name,
    products: req.session.cart,
    totalAmount: totalAmount,
    totalProducts: totalProduct,
    orderDate: formattedDate,
    status: "Delivered",
    shippingAddress: req.user.address,
    paymentMethod: "ZCoin",
    paymentStatus: "Confirmed",
    shippingMethod: "Free Tracked Shipping (4-7 Working Days)",
    phone: req.user.phone
  })
  await order.save();
  await User.findOneAndUpdate({ _id: req.user._id }, { $push: { orders: order._id } });
  res.redirect(`/genz/order/confirmed/${order._id}`);
})

app.get("/genz/order/confirmed/:id", sanitizeUserContent, async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({ _id: id });
  req.session.cart = [];
  res.render("orderDetails", { order });
})



















// app.get("/cart", (req, res) => {
//   console.log(req.session.cart);
// })

// app.get("/user", async (req, res) => {
//   console.log(req.flash("failureMessage"))
// })


app.get("/create", (req, res) => {

  res.render("create");

})



app.post("/create", async (req, res) => {
  const { name, price, gender, type, featured, xsdescription } = req.body;
  const colorurl = req.body.colorurl.split(",");
  const description = req.body.description.split("\n");
  const sizes = req.body.sizes.split(",");
  const product = new Product({
    name: name, price: price, gender: gender, description: description, colors: colorurl, sizes: sizes, xsdescription: xsdescription, type: type, featured: featured
  });
  await product.save();
  res.send("Product created");

})



app.listen(3000, () => {
  console.log("jai shree ganesha");
})
