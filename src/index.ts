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

const readSensitiveData = () => {
    if (!fs.existsSync("data2.json")) {
        console.error("No data2.json at root");
        return null;
    }
    const data = fs.readFileSync("data2.json")
    return data.toString();
}


app.post("/prvi", async (req, res) => {
    const data = req.body;
    const unsafe = !!req.cookies ? (req.cookies["SAFETY-OFF"] === "true" || !req.cookies["SAFETY-OFF"]) : false;

    let saveData = unsafe ? JSON.stringify(data) : JSON.stringify(sanitizeHtml(data));

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

//Encrypting text
function encrypt(text: string) {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypting text
function decrypt(text: ReturnType<typeof encrypt>) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function writeEncrypted(encripted: boolean) {
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

    if (encripted) {
        const encriptedData = encrypt(rawData)

        fs.writeFileSync("data2.json", JSON.stringify(encriptedData))
    } else {
        fs.writeFileSync("data2.json", rawData)
    }
}

const sensitiveDataIsEncripted = () => {
    if (!fs.existsSync("is-encripted.json")) {
        return false;
    }

    return JSON.parse(fs.readFileSync("is-encripted.json").toString()) as boolean
}

const writeIsSensitiveDataEncripted = (isEnc: boolean) => {
    fs.writeFileSync("is-encripted.json", JSON.stringify(isEnc));
}


app.get("/drugi", async (req, res) => {
    const rawData = readSensitiveData();
    let unsafe = !!req.cookies ? req.cookies["2SAFETY-OFF"] === "true" : false;
    if (!req.cookies["2SAFETY-OFF"]) {
        if (rawData) {
            unsafe = !sensitiveDataIsEncripted();
            console.log("ima podataka", unsafe)
        } else {
            writeEncrypted(true);
            writeIsSensitiveDataEncripted(true);
            unsafe = true;
        }
        res.cookie("2SAFETY-OFF", JSON.stringify(unsafe));
    }
    console.log("provjera unsafe", unsafe)


    if (req.cookies["UPDATE"] === "true") {
        writeEncrypted(!unsafe)

        res.clearCookie("UPDATE")
    }

    console.log("rawData", rawData)

    if (rawData) {
        console.log("unsafe", unsafe)
        let data = unsafe ? JSON.parse(rawData) : JSON.parse(decrypt(JSON.parse(rawData) as ReturnType<typeof encrypt>));

        if (!unsafe) {
            delete data.oib
            delete data.dateOfBirth
        }

        console.log("data", data)

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
