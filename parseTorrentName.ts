const ptt = require("parse-torrent-title");
const fs = require("fs");
const minimist = require("minimist");
const OS = require("opensubtitles-api");
const path = require("path");
const http = require("http");
const VIDEO_EXT = [".mp4", ".mkv", ".avi"];
const SUBTITLE_EXT = ["srt", "vtt"];
const https = require("https");

interface movieInformation {
  title: string;
  year: string;
}

interface serieInformation {
  title: string;
  year: string;
  season: number;
  episode: number;
}

interface osInfos {
  username: string | undefined;
  password: string | undefined;
}

const download = function (url: string, dest: string) {
  const request = https.get(url, function (response) {
    if (response.statusCode === 200) {
      var file = fs.createWriteStream(dest);
      response.pipe(file);
    }
    request.setTimeout(60000, function () {
      request.abort();
    });
  });
};

const isFile = (path: string) => {
  return !fs.lstatSync(path).isDirectory();
};

const createOS = (osInfos: osInfos) => {
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

interface FilmInfo {
  fileName: string;
  fileDirectory: string;
}

const createFilmsInfoFromFile = (filmPath: string): FilmInfo[] => {
  const fileName = path.basename(filmPath);
  const fileDirectory = path.parse(filmPath).dir;
  return [
    {
      fileName: fileName,
      fileDirectory: fileDirectory,
    },
  ];
};

const createFilmsInfoFromFolder = (filmsPath: string): FilmInfo[] => {
  const filmInfo = [];
  const files = fs.readdirSync(filmsPath);
  if (!files) return filmInfo;
  files.forEach((file) => {
    const ext = path.extname(file);
    if (VIDEO_EXT.indexOf(ext) != -1) {
      filmInfo.push({
        fileName: file,
        fileDirectory: filmsPath,
      });
    }
  });
  /*fs.readdir(filmsPath, (err, files) => {
    if (!files) return filmInfo;
    files.forEach((file) => {
      const ext = path.extname(file);
      if (VIDEO_EXT.indexOf(ext) != -1) {
        filmInfo.push({
          fileName: file,
          fileDirectory: filmsPath,
        });
      }
    });
  });*/
  return filmInfo;
};

const createFilmsInfo = (filmPath: string): FilmInfo[] => {
  if (isFile(filmPath)) {
    return createFilmsInfoFromFile(filmPath);
  }
  return createFilmsInfoFromFolder(filmPath);
};

const createSimpleQuery = (filmInfo: FilmInfo) => {
  let query = {
    path: `${filmInfo.fileDirectory}/${filmInfo.fileName}`,
    filename: filmInfo.fileName,
    extensions: SUBTITLE_EXT,
  };
  return query;
};

const createComplexQuery = (filmInfo: FilmInfo) => {
  const info = ptt.parse(filmInfo.fileName);
  const isMovie = info.season == undefined;
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

const getSubtitlesUrl = (filmInfo: FilmInfo, OpenSubtitles) => {
  return OpenSubtitles.search(createSimpleQuery(filmInfo))
    .then((subsInfo) => {
      if (!subsInfo || !subsInfo["en"])
        return OpenSubtitles.search(createComplexQuery(filmInfo)).then(
          (complexSubs) => {
            return complexSubs["en"];
          }
        );
      return subsInfo["en"];
    })
    .catch(() => {
      console.log("Error dans le download des soustitres");
    });
};

interface SubInfo {
  url: string;
  filename: string;
}

const downloadSubtitle = (subInfo: SubInfo, filmPath: string) => {
  if (subInfo) {
    const url = subInfo.url;
    const subName = subInfo.filename;
    if (url) download(url, `${filmPath}/${subName}`);
  }
};

const downloadSubtitles = (filmPath: string, osInfos: osInfos) => {
  const OpenSubtitles = createOS(osInfos);
  OpenSubtitles.login()
    .then(() => {
      const filmInfos = createFilmsInfo(filmPath);
      filmInfos.forEach((filmInfo) => {
        getSubtitlesUrl(filmInfo, OpenSubtitles).then((subInfo) => {
          downloadSubtitle(subInfo, filmInfo.fileDirectory);
        });
      });
    })
    .catch((err) => {
      console.log("error while loggin to OS", err);
    });
};

const createMoviePath = (information: movieInformation, targetDir: string) => {
  const movieTitle = information.title;
  const year = information.year ? information.year : "";
  const folderName = `${movieTitle} (${year})`;
  return `${targetDir}/Movies/${folderName}`;
};

const createSeriesPath = (
  information: serieInformation,
  targetDir: string,
  seasonNumber: string | undefined
) => {
  const serieTitle = information.title;
  const season = seasonNumber ? seasonNumber : information.season;
  const serieFolder = `${targetDir}/TV Shows/${serieTitle}/`;
  if (!fs.existsSync(serieFolder)) {
    fs.mkdirSync(serieFolder);
  }
  return `${serieFolder}/Season ${season}/`;
};

const verifyIfMovie = (downloadPath: string, torrentName: string) => {
  if (isFile(`${downloadPath}/${torrentName}`)) {
    const information = ptt.parse(torrentName);
    if (information.season != undefined || information.episode != undefined)
      return false;
    return true;
  }
  const files = fs.readdirSync(`${downloadPath}/${torrentName}`);
  let isMovie = true;
  files.forEach((file) => {
    const ext = path.extname(file);
    if (VIDEO_EXT.indexOf(ext) != -1) {
      const information = ptt.parse(file);
      if (information.season !== undefined || information.episode !== undefined)
        isMovie = false;
    }
  });
  return isMovie;
};

const fetchSeasonFromEpisode = (downloadPath: string, torrentName: string) => {
  const files = fs.readdirSync(`${downloadPath}/${torrentName}`);
  let seasonNumber;
  files.forEach((file) => {
    const ext = path.extname(file);
    if (VIDEO_EXT.indexOf(ext) != -1) {
      const information = ptt.parse(file);
      seasonNumber = information.season;
    }
  });
  return seasonNumber;
};

const logProcess = (name: string, information) => {
  fs.appendFile(
    "/tmp/logProcess",
    `Name: ${name}, \n info:${JSON.stringify(information)}`,
    function (err) {
      if (err) {
        return console.log(err);
      }
      console.log("The file was saved!");
    }
  );
};

let args = minimist(process.argv.slice(2));
const torrentName = args.n;
const targetDir = args.t;
const downloadPath = args.d;
const osUsername = args.u ? args.u : undefined;
const osPassword = args.p ? args.p : undefined;
const information = ptt.parse(torrentName);

logProcess(torrentName, information);

const torrentIsMovie = verifyIfMovie(downloadPath, torrentName);
let seasonNumber;
if (!torrentIsMovie) {
  if (!information.season) {
    seasonNumber = fetchSeasonFromEpisode(downloadPath, torrentName);
  }
}
const currentPath = `${downloadPath}/${torrentName}`;
let newPath = torrentIsMovie
  ? createMoviePath(information, targetDir)
  : createSeriesPath(information, targetDir, seasonNumber);
if (!fs.existsSync(newPath)) {
  fs.mkdirSync(newPath);
}

if (isFile(currentPath)) {
  newPath = `${newPath}${torrentName}`;
}
fs.rename(currentPath, newPath, () => {
  downloadSubtitles(newPath, { username: osUsername, password: osPassword });
});
