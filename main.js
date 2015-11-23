var fs = require('fs');
var async = require("async");
var AdmZip = require('adm-zip');
var jschardet = require("jschardet");
var iconv = require('iconv-lite');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var multer = require('multer');
var renderingEngine = require('ejs-locals');
var stream = require('stream');
var events = require('events');
var OsVer = {"6":["Windows Vista","Windows Server 2008","Windows 7", "Windows Server 2008 R2"],"5":["Windows 2000", "Windows XP", "Windows Server 2003", "Windows Server 2003 R2"], "64_86":["Windows XP", "Windows Server 2003", "Windows Server 2003 R2", "Windows 7", "Windows 8", "Windows 10"]};
var ArcVer = {"AMD64":"64 BIT", "X86":"32 BIT", "IA64":"64 BIT (Intel Itanium)"};

var app = express();
app.engine('ejs', renderingEngine);
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(8080, function () {    
    console.log('Express server listening on port 8080');
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname+'/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+"_"+file.originalname)
  }
}) 

var upload = multer({ storage: storage });
var uploadsPath = "uploads/";
var infsPath = "/infs/";

app.get('/', function(req, res){
	res.render('index');
});

app.post('/uploads', upload.array('inffile', 10), function(req, res){
	response = res;
	console.log(req.files);
	fileName = req.files[req.files.length - 1]["filename"];
	unZip(fileName, sendResponse);
});

var response;
function sendResponse(ResponseObj){
	var responseJSON = JSON.stringify(ResponseObj);
	console.log("Response sending");	
	response.write(responseJSON);
	DriverObj = {};
	linesArr =[];		
	response.end();			
}

function unZip(fileName){
	var zip = new AdmZip(uploadsPath+fileName);
	var zipEntries = zip.getEntries(); 
	var entrysPathsArr =[];
	zipEntries.forEach(function(zipEntry) {
	    if (~zipEntry.entryName.search(/.inf$/ig)) {	    	
	    	var singleInfPath = fileName.replace(/.zip/,'');    	 
	        zip.extractEntryTo(zipEntry, __dirname+infsPath+singleInfPath, /*maintainEntryPath*/false, /*overwrite*/true);	        
	        entrysPathsArr.push(singleInfPath+"/"+zipEntry.name);
	    }
	});	

	async.each(entrysPathsArr, 
		function(singleInfPathName, callback){
			getContent(singleInfPathName, function(){				
				callback();
			});		 
		}, 
		function(err){
			if(err)	console.log(err);
			sendResponse(DriverObj);
		}
	);
}

var linesArr =[];
function getContent(singleInfPathName, cb){
	fs.readFile(__dirname+infsPath+singleInfPathName, function(err, data){
		if (err) cb(err);
		var dataEncoding = jschardet.detect(data).encoding;
		var content = iconv.decode(data, dataEncoding).toString();
		var infFileName = singleInfPathName.replace(/.+\//,"");	
		getSection(infFileName, content);					
		cb();
	});
}

function getSection(infFileName, content){	
	var regex = /(?:\[Manufacturer\]\r\n)((^.+\r\n)+)/gm 	
	while(result = regex.exec(content)){		
		var splitedStrArr = result[1].split(/\r\n/g);
		for (n=0; n<splitedStrArr.length; n++){
			if (splitedStrArr[n] !=""){				
				linesArr.push(splitedStrArr[n]);
			}
		}		
	}	
	buildDriverObj(infFileName, linesArr);	
}

var DriverObj = {};
function buildDriverObj(infFileName, linesArr){
	DriverObj[infFileName]={};
	for(n=0; n<linesArr.length; n++){
		var LineString  = linesArr[n];
		var Manufacturer = LineString.match(/.+(?==)/)[0].replace(/(^\s+|\s+$)/g,''); // Manufacturer
		var Model = LineString.match(/=.+?(?=,)/)[0].replace(/(^[=\s]+|\s+$)/g,'');  // Model
		var OSPlatformArr = LineString.match(/,.+/)[0].replace(/,+/,"").split(/,/);
		OSPlatformArr.forEach(function(item, i, arr){
			 var fullOsName = changeOsName(item.replace(/(^\s+|\s+$)/g,''));
			 arr[i] = fullOsName;
		}); // OS fullnames Array	
		if(DriverObj[infFileName][Manufacturer]){
			if(DriverObj[infFileName][Manufacturer][Model]){
				OSPlatformArr.forEach(function(item){
					if(DriverObj[infFileName][Manufacturer][Model].indexOf(item)==-1) DriverObj[infFileName][Manufacturer][Model].push(item);
				})
			} else {
				DriverObj[infFileName][Manufacturer][Model] =[];
				OSPlatformArr.forEach(function(item){
					DriverObj[infFileName][Manufacturer][Model].push(item);
				})
			}
		} else {
			DriverObj[infFileName][Manufacturer] = {};
			DriverObj[infFileName][Manufacturer][Model] =[];
			OSPlatformArr.forEach(function(item){
				DriverObj[infFileName][Manufacturer][Model].push(item);
			})
		}
	}	
}

 function changeOsName(osname){ 	
 	var osNameArr = osname.replace(/^NT/,'').toUpperCase().split(".");
 	var osArcVer = osNameArr[0];
 	var osMajorVer = osNameArr[1]; 	
 	if (!osMajorVer){if ((osArcVer=="AMD64")||(osArcVer=="X86")) {osMajorVer = "64_86"}}; 	
 	osname = ArcVer[osArcVer]+": "+OsVer[osMajorVer];
 	return osname;
 }