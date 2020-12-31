const ptt = require("parse-torrent-title");
const fs = require('fs')
const minimist = require('minimist');

interface movieInformation {
    title:string,
    year:string
}

const handleMovie = (information: movieInformation, targetDir:string) => {
    const movieTitle = information.title
    const year = information.year ? information.year : ""
    const folderName = `${movieTitle} (${year})`
    const dir = `${targetDir}/Movies/${folderName}`
   if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
}


let args = minimist(process.argv.slice(2))
const torrentName = args.n
const targetDir = args.t
const information = ptt.parse(torrentName);

const torrentIsMovie = information.episode === undefined

if (torrentIsMovie){
    handleMovie(information, targetDir)
}



console.log(information.title);      // Game of Thrones
console.log(information.season);     // 1
console.log(information.episode);    // 1
console.log(information.resolution); // 720p
console.log(information.codec);      // x264
console.log(information.source);     // HDTV
console.log(information.group);      // CTU