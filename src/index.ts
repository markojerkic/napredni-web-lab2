import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import cookieParser from "cookie-parser";
import sanitizeHtml from 'sanitize-html';
import crypto from "crypto";

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

const readSensitiveData = (unsafe: boolean): string => {
    if (!fs.existsSync("data2-safe.json") || !fs.existsSync("data2-unsafe.json")) {
        console.error("No data2.json at root");
        writeEncrypted()
        return readSensitiveData(unsafe);
    }
    const data = fs.readFileSync(`data2-${unsafe ? 'unsafe' : 'safe'}.json`)
    return data.toString();
}


app.post("/prvi", async (req, res) => {
    const data = req.body;
    const unsafe = !!req.cookies ? (req.cookies["SAFETY-OFF"] === "true" || !req.cookies["SAFETY-OFF"]) : false;

    let saveData = JSON.stringify(data);

    fs.writeFileSync("data.json", saveData);
    return res.redirect("/prvi");
})

app.get("/prvi", async (req, res) => {
    const data = readImageData();
    const unsafe = !!req.cookies ? req.cookies["SAFETY-OFF"] === "true" : false;
    let link = unsafe ? data?.link : sanitizeHtml(data?.link ?? "");
    return res.render("prvi.pug", {
        link,
        safetyOff: unsafe
    });
});

const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

{/* //Encrypting text */ }
{/* function encrypt(text: string) { */ }
{/*     let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv); */ }
{/*     let encrypted = cipher.update(text); */ }
{/*     encrypted = Buffer.concat([encrypted, cipher.final()]); */ }
{/*     return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') }; */ }
{/* } */ }
{/**/ }
{/* // Decrypting text */ }
{/* function decrypt(text: ReturnType<typeof encrypt>) { */ }
{/*     let iv = Buffer.from(text.iv, 'hex'); */ }
{/*     let encryptedText = Buffer.from(text.encryptedData, 'hex'); */ }
{/*     let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv); */ }
{/*     let decrypted = decipher.update(encryptedText); */ }
{/*     decrypted = Buffer.concat([decrypted, decipher.final()]); */ }
{/*     return decrypted.toString(); */ }
{/* } */ }
{/**/ }

const encrypt = (plainText: string, password: string) => {
    try {
        const iv = crypto.randomBytes(16);
        const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        let encrypted = cipher.update(plainText);
        encrypted = Buffer.concat([encrypted, cipher.final()])
        return iv.toString('hex') + ':' + encrypted.toString('hex');

    } catch (error) {
        console.log(error);
    }
}
const decrypt = (encryptedText: string, password: string) => {
    try {
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');

        const encryptedData = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        const decrypted = decipher.update(encryptedData);
        const decryptedText = Buffer.concat([decrypted, decipher.final()]);
        return decryptedText.toString();
    } catch (error) {
        console.log(error)
    }
}
const STRONG_PASS = `C&3r(]}Pa>N^9TD*"/t)J<`;

function writeEncrypted() {
    const rawData = `[
              {
                "key": "oib",
                "value": "moj oib"
              },
              {
                "key": "name",
                "value": "Marko"
              },
              {
                "key": "surname",
                "value": "Prezime"
              },
              {
                "key": "dateOfBirth",
                "value": "Moj rođendan"
              }
            ]`;

    const encriptedData = encrypt(rawData, STRONG_PASS)!;

    fs.writeFileSync("data2-safe.json", encriptedData)
    fs.writeFileSync("data2-unsafe.json", rawData)
}


app.get("/drugi", async (req, res) => {
    let unsafe = !!req.cookies ? (req.cookies["2SAFETY-OFF"] === "true" || !req.cookies["2SAFETY-OFF"]) : false;
    const rawData = readSensitiveData(unsafe);

    if (rawData) {
        let data = unsafe ? JSON.parse(rawData) : JSON.parse(decrypt(rawData, STRONG_PASS)!);

        if (!unsafe) {
            data = data.filter((d: {key: string, value: string}) => d.key !== "oib" && d.key !== "dateOfBirth");
        }

        return res.render("drugi.pug", {
            data,
            safetyOff: unsafe
        });
    }
    return res.render("drugi.pug", {
        safetyOff: true
    });
});

app.get("/", async (_req, res) => {
    return res.render("index.pug");
});


app.listen(3000, () => {
    console.log("Server podignut");
})
