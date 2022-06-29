require("dotenv").config(); //for use env variables
const multer = require("multer"); // for file handling
const mongoose = require("mongoose"); // for mongoDB
const bcrypt = require("bcrypt"); // for encrypting the password

const File = require("./models/File"); // the file model

const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

/*
dest -> where the file that upload should be stored
return a middleware that handle the file
*/
const upload = multer({ dest: "uploads" });

mongoose.connect(process.env.DATABASE_URL_DEV);

// for use ejs files
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index"); //render the index.ejs file and send it to the user
});
/*
upload.single("file") -> get the 'file' prop from the body and process it
will put in rhe req a object file
*/
app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    // get the file data that we want
    path: req.file.path,
    originalName: req.file.originalname,
  };

  if (req.body.password != null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData);

  // the json object its optional data that we can pass to the ejs file
  res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` });
});

app.route("/file/:id").get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id);

  if (file.password != null) {
    if (req.body.password == null) {
      return res.render("password");
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      return res.render("password", { error: true });
    }
  }

  file.downloadCount++;
  await file.save();
  console.log(
    `The file '${file.originalName}' was downloaded ${file.downloadCount} times`
  );

  // download the file form this path and give him the original file name
  res.download(file.path, file.originalName);
}

app.listen(process.env.PORT);
