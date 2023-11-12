import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import cookieParser from "cookie-parser";
import sanitizeHtml from 'sanitize-html';

dotenv.config();
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const readImageData = () => {
    if (!fs.existsSync("data.json")) {
        console.error("No data.json at root");
        return null;
    }
    const data = fs.readFileSync("data.json")
    if (data) {
        console.log(data.toString())
        try {
            return JSON.parse(data.toString()) as { link: string } | null;
        } catch (e) {
            console.error("No data", e)
            return null;
        }
    } else {
        console.error("No data")
        return null;
    }
}

app.post("/prvi", async (req, res) => {
    const data = req.body;
    const unsafe = !!req.cookies ? req.cookies["SAFETY-OFF"] === "true" : false;

    let saveData = unsafe? JSON.stringify(data): JSON.stringify(sanitizeHtml(data));

    fs.writeFileSync("data.json", saveData);
    return res.redirect("/prvi");
})

app.get("/prvi", async (req, res) => {
    const data = readImageData();
    const unsafe = !!req.cookies ? req.cookies["SAFETY-OFF"] === "true" : false;
    let link = unsafe ? data?.link : sanitizeHtml(data?.link ?? "");
    console.log("link", link);
    return res.render("prvi.pug", {
        link,
        safetyOff: unsafe
    });
});


app.listen(3000, () => {
    console.log("Server podignut");
})
