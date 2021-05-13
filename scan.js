var path = require('path'), fs=require('fs');
var ExifImage = require('exif').ExifImage;
const sharp = require("sharp");
const ObjectsToCsv = require('objects-to-csv');
const folder_out = 'image_resized\\';
const csv = require('csv-parser');
	
function fromDir(startPath,filter){
	var list = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            fromDir(filename,filter); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            console.log('-- found: ',filename);
			(async function () {
				try {
					// Get file name
					const words = filename.split('\\');
					var path_out = folder_out.concat(words[1]);
					// Resizes the image
					sharp(filename).resize(50, 50).png().toFile(path_out);
				} catch (error) {
					console.log(error);
				}
			})();
			try {
				var metadata = new ExifImage({ image : filename }, function (error, exifData) {
					if (error)
						console.log('Error: '+error.message);						
				});
				list.push(metadata);	
				if(i==files.length - 1){	
					const csv = new ObjectsToCsv(list);
					csv.toDisk('./list.csv', { append: true });
				}
			} catch (error) {
				console.log('Error: ' + error.message);
			}
        };
    };
};

fromDir('./image','.jpg');
