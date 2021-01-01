const ptt = require("parse-torrent-title");
const fs = require("fs");
const minimist = require("minimist");
const OS = require("opensubtitles-api");
const path = require("path");
const http = require("http");
const VIDEO_EXT = [".mp4", ".mkv", ".avi"];
const SUBTITLE_EXT = ["srt", "vtt"];

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

const createJsonForQuery = (filePath: string, fileName: string) => {
  let query = {
    path: `${filePath}/${fileName}`,
    filename: fileName,
    extensions: SUBTITLE_EXT,
  };
  return query;
};

const createJsonForQueryByQuery = (fileName: string) => {
  const info = ptt.parse(fileName);
  const isMovie = info.episode == undefined;
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

const getSubtitlesUrl = (
  fileName: string,
  filePath: string,
  osInfo: osInfos
) => {
  let OpenSubtitles;
  if (osInfo.username && osInfo.password)
    OpenSubtitles = new OS("UserAgent", osInfo.username, osInfo.password);
  else OpenSubtitles = new OS("UserAgent");
  return OpenSubtitles.login()
    .then(function () {
      return OpenSubtitles.search(createJsonForQuery(filePath, fileName)).then(
        function (subtitles) {
          if (!subtitles || !subtitles["en"])
            return OpenSubtitles.search(
              createJsonForQueryByQuery(fileName)
            ).then((simpleSubtitles) => {
              return simpleSubtitles["en"];
            });
          return subtitles["en"];
        }
      );
    })
    .catch(function () {
      console.log("Error dans le download des soustitres");
    });
};

const download = function (url: string, dest: string) {
  const request = http.get(url, function (response) {
    if (response.statusCode === 200) {
      var file = fs.createWriteStream(dest);
      response.pipe(file);
    }
    request.setTimeout(60000, function () {
      request.abort();
    });
  });
};

const downloadSubtitles = (filePath: string, osInfo: osInfos) => {
  fs.readdir(filePath, (err, files) => {
    if (!files) return;
    files.forEach((file) => {
      const ext = path.extname(file);
      if (VIDEO_EXT.indexOf(ext) != -1) {
        getSubtitlesUrl(file, filePath, osInfo).then((subInfo) => {
          if (subInfo) {
            const url = subInfo.url;
            const subName = subInfo.filename;
            if (url) download(url, `${filePath}/${subName}`);
          }
        });
      }
    });
  });
};

const createMoviePath = (information: movieInformation, targetDir: string) => {
  const movieTitle = information.title;
  const year = information.year ? information.year : "";
  const folderName = `${movieTitle} (${year})`;
  return `${targetDir}/Movies/${folderName}`;
};

const createSeriesPath = (information: serieInformation, targetDir: string) => {
  const serieTitle = information.title;
  const season = information.season;
  const serieFolder = `${targetDir}/TV Shows/${serieTitle}/`;
  if (!fs.existsSync(serieFolder)) {
    fs.mkdirSync(serieFolder);
  }
  return `${serieFolder}/Season ${season}/`;
};

let args = minimist(process.argv.slice(2));
const torrentName = args.n;
const targetDir = args.t;
const downloadPath = args.d;
const osUsername = args.u ? args.u : undefined;
const osPassword = args.p ? args.p : undefined;
const information = ptt.parse(torrentName);

const torrentIsMovie = information.episode === undefined;
const currentPath = `${downloadPath}/${torrentName}`;
const newPath = torrentIsMovie
  ? createMoviePath(information, targetDir)
  : createSeriesPath(information, targetDir);
if (!fs.existsSync(newPath)) {
  fs.mkdirSync(newPath);
}
fs.rename(currentPath, newPath, () => {
  downloadSubtitles(newPath, { username: osUsername, password: osPassword });
});
