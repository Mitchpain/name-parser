const ptt = require("parse-torrent-title");
const fs = require("fs");
const mv = require("mv");
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

interface OsInfos {
  username: string | undefined;
  password: string | undefined;
}

const download = function (url: string, dest: string) {
  const request = https.get(url, function (response) {
    if (response.statusCode === 200) {
      var file = fs.createWriteStream(dest);
      response.pipe(file);
    } else {
      logProcess(`error`, `while downloading subs ${response}`);
    }
    request.setTimeout(60000, function () {
      logProcess(`error`, `timeout while downloading subs`);
      request.abort();
    });
  });
};

const isFile = (path: string) => {
  return !fs.lstatSync(path).isDirectory();
};

const createOS = (osInfos: OsInfos) => {
  let OpenSubtitles;
  if (osInfos.username && osInfos.password)
    OpenSubtitles = new OS({
      useragent: "UserAgent",
      username: osInfos.username,
      password: osInfos.password,
      ssl: true,
    });
  else
    OpenSubtitles = new OS({
      useragent: "UserAgent",
      ssl: true,
    });
  return OpenSubtitles;
};

const createSimpleQuery = (filmInfo: MovedFileInfo) => {
  let query = {
    path: `${filmInfo.directory}/${filmInfo.name}`,
    filename: filmInfo.name,
    extensions: SUBTITLE_EXT,
  };
  return query;
};

const createComplexQuery = (filmInfo: MovedFileInfo) => {
  const info = ptt.parse(filmInfo.name);
  const isMovie = verifyIfMovie(info);
  let query = {
    query: info.title,
    extensions: SUBTITLE_EXT,
  };
  if (!isMovie) {
    if (info.season) {
      query["season"] = info.season;
    }
    if (info.episode) {
      query["episode"] = info.episode;
    }
  }
  return query;
};

const searchSubtitle = (movedFileInfos: MovedFileInfo, OpenSubtitles) => {
  return OpenSubtitles.search(createSimpleQuery(movedFileInfos))
    .then((subsInfo) => {
      if (!subsInfo || !subsInfo["en"])
        return OpenSubtitles.search(createComplexQuery(movedFileInfos))
          .then((complexSubs) => {
            return complexSubs["en"];
          })
          .catch((err) => {
            logProcess("error", `while searching complex query ${err}`);
          });
      return subsInfo["en"];
    })
    .catch((err) => {
      logProcess("error", `while searching simple query ${err}`);
    });
};

interface SubInfo {
  url: string;
  filename: string;
}

const downloadSubtitle = (subInfo: SubInfo, filmPath: string) => {
  const url = subInfo.url;
  const subName = subInfo.filename;
  if (url) download(url, `${filmPath}/${subName}`);
};

const downloadSubtitles = (filesInfos: MovedFileInfo[], osInfos: OsInfos) => {
  const OpenSubtitles = createOS(osInfos);
  OpenSubtitles.login()
    .then(async () => {
      for (const fileInfo of filesInfos) {
        if (fileInfo) {
          const subInfos = await searchSubtitle(fileInfo, OpenSubtitles);
          if (subInfos) {
            logProcess(`subs`, `found ${fileInfo.name}`);
            downloadSubtitle(subInfos, fileInfo.directory);
          } else {
            logProcess(`subs`, `not found ${fileInfo.name}`);
          }
        }
      }
    })
    .catch((err) => {
      logProcess("Error", `while loggin to OS, ${err}`);
    });
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
  const path = `${targetDir}/Movies/${folderName}`;
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

const extractOSInfos = (args): OsInfos => {
  const osUsername = args.u ? args.u : undefined;
  const osPassword = args.p ? args.p : undefined;
  return {
    username: osUsername,
    password: osPassword,
  };
};

const processFolder = (
  currentDirectory: string,
  folderName: string,
  targetDirectory: string
): MovedFileInfo[] => {
  let movedFileInfos: MovedFileInfo[] = [];
  const folderPath = `${currentDirectory}/${folderName}`;
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    movedFileInfos.push(processFile(folderPath, file, targetDirectory));
  });
  return movedFileInfos;
};

const processFile = (
  currentDirectory: string,
  fileName: string,
  targetDirectory: string
): MovedFileInfo => {
  const ext = path.extname(fileName);
  if (VIDEO_EXT.indexOf(ext) == -1) return undefined;

  const information = ptt.parse(fileName);

  const fileIsMovies = verifyIfMovie(information);

  const newDir = fileIsMovies
    ? createMoviePath(information, targetDirectory)
    : createSeriesPath(information, targetDirectory);

  const newPath = `${newDir}/${fileName}`;
  const currentPath = `${currentDirectory}/${fileName}`;

  mv(currentPath, newPath, function (err) {
    if (err) {
      logProcess(`processFile: ${fileName}`, `error: ${err}`);
    } else {
      logProcess(`processFile: ${fileName}`, `completed`);
    }
  });
  return {
    name: fileName,
    directory: newDir,
  };
};

let args = minimist(process.argv.slice(2));
const torrentName = args.n;
const targetDir = args.t;
const downloadPath = args.d;

let movedFileInfos: MovedFileInfo[];

if (isFile(`${downloadPath}/${torrentName}`)) {
  movedFileInfos = [processFile(downloadPath, torrentName, targetDir)];
} else {
  movedFileInfos = processFolder(downloadPath, torrentName, targetDir);
}
downloadSubtitles(movedFileInfos, extractOSInfos(args));
