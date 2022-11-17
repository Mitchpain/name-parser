const ptt = require("parse-torrent-title");
const fs = require("fs");
const minimist = require("minimist");
const OS = require("opensubtitles-api");
const path = require("path");
const VIDEO_EXT = [".mp4", ".mkv", ".avi"];
const SUBTITLE_EXT = ["srt", "vtt"];
const https = require("https");

interface MovieInformation {
  title: string;
  year: string;
  season: number;
  episode: number;
}

interface MovedFileInfo {
  directory: string;
  name: string;
}

const isFile = (path: string) => {
  return !fs.lstatSync(path).isDirectory();
};
const createPath = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
};

const createMoviePath = (information: MovieInformation, targetDir: string) => {
  const movieTitle = information.title;
  const year = information.year ? information.year : "";
  const folderName = `${movieTitle} (${year})`;
  const path = `${targetDir}/Movies/${folderName}/`;
  createPath(path);
  return path;
};

const createSeriesPath = (information: MovieInformation, targetDir: string) => {
  const serieTitle = information.title;
  const season = information.season;
  const serieFolder = `${targetDir}/Tv/${serieTitle}/`;
  createPath(serieFolder);
  const seasonFolder = `${serieFolder}/Season ${season}/`;
  createPath(seasonFolder);
  return seasonFolder;
};

const verifyIfMovie = (information: MovieInformation) => {
  if (information.season != undefined || information.episode != undefined)
    return false;
  return true;
};

const logProcess = (name: string, information) => {
  fs.appendFile(
    "/tmp/logProcess",
    `${name}, \n ${JSON.stringify(information)} \n \n`,
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    }
  );
};

const processFolder = (
  currentDirectory: string,
  folderName: string,
  targetDirectory: string
)=> {
  const folderPath = `${currentDirectory}/${folderName}`;
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    if (isFile(`${folderPath}/${file}`)) {
    processFile(folderPath, file, targetDirectory);
    } else {
      processFolder(folderPath, file, targetDirectory);
    }
  });
};

const processFile = (
  currentDirectory: string,
  fileName: string,
  targetDirectory: string
) =>{
  const ext = path.extname(fileName);
  if (VIDEO_EXT.indexOf(ext) == -1) return undefined;

  const information = ptt.parse(fileName);

  const fileIsMovies = verifyIfMovie(information);

  const newDir = fileIsMovies
    ? createMoviePath(information, targetDirectory)
    : createSeriesPath(information, targetDirectory);

  const newPath = `${newDir}${fileName}`;
  const currentPath = `${currentDirectory}/${fileName}`;
  fs.rename(currentPath, newPath, (err) => {
    if (err) {
      logProcess(`processFile: ${fileName}`, `error: ${err}`);
    }
    logProcess(`processFile: ${fileName}`, `completed`);
  });
};

let args = minimist(process.argv.slice(2));
const torrentName = args.n;
const targetDir = args.t;
const downloadPath = args.d;


if (isFile(`${downloadPath}/${torrentName}`)) {
  processFile(downloadPath, torrentName, targetDir);
} else {
  processFolder(downloadPath, torrentName, targetDir);
}
//downloadSubtitles(movedFileInfos, extractOSInfos(args));
