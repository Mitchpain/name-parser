const ptt = require("parse-torrent-title");
const minimist = require('minimist');
let args = minimist(process.argv.slice(2))
const torrentName = args.n
const information = ptt.parse(torrentName);

const torrentIsMovie = information.episode === undefined
 
console.log(information.title);      // Game of Thrones
console.log(information.season);     // 1
console.log(information.episode);    // 1
console.log(information.resolution); // 720p
console.log(information.codec);      // x264
console.log(information.source);     // HDTV
console.log(information.group);      // CTU