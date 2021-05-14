var path = require('path'), fs=require('fs');
var ExifImage = require('exif').ExifImage;
const sharp = require("sharp");
const ObjectsToCsv = require('objects-to-csv');
const folder_out = 'image_resized\\';
const csv = require('csv-parser');
const results = [];

function fromDir(startPath,filter){
	var list = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
	fs.createReadStream('list.csv')
	.pipe(csv({}))
	.on('data', (data) => results.push(data))
	.on('end', () => {
		//console.log(results);
		file_for_sloop:
		for(var i=0;i<files.length;i++){
			var filename=path.join(startPath,files[i]);
			console.log('----------------' ,filename)
			var stat = fs.lstatSync(filename);
			if (stat.isDirectory()){
				fromDir(filename,filter); //recurse
			}
			else if (filename.indexOf(filter)>=0) {
				console.log('-- found: ',filename);
				for(var j=0;j<results.length;j++){
					var options = JSON.parse(results[j].options);
					console.log(options.image);
					if (options.image == filename)
					{
						continue file_for_sloop;
					}
				}
				console.log('-- found and accepted: ',filename);
				(async function () { // asynchrone 
					try {
						// Get file name
						const words = filename.split('\\'); // find last Index Of \
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
	});
};


fromDir('./image','.jpg');
function task(){
setTimeout(task, 1000); // appel des 3 dossiers toutes les secondes task va appeler fromdir 3 fois
}
task()
// 