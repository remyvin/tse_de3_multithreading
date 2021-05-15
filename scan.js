var path = require('path'), fs=require('fs');
var ExifImage = require('exif').ExifImage;
const sharp = require("sharp");
const ObjectsToCsv = require('objects-to-csv');
const folder_out = 'image_resized\\';
const csv = require('csv-parser');
var readline = require('readline');
const results = [];
const r1 = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

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
		console.log(files);
		file_for_sloop:
		for(var i=0;i<files.length;i++){
			var filename=path.join(startPath,files[i]);
			var stat = fs.lstatSync(filename);
			if (stat.isDirectory()){
				fromDir(filename,filter); //recurse
			}
			else if (filename.indexOf(filter)>=0) {
				for(var j=0;j<results.length;j++){
					var options = JSON.parse(results[j].options);
					if (options.image == filename)
					{
						continue file_for_sloop;
					}
				}
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

async function main(){
	const results_output = [];
	var clef = await ask("Hello you can add a word and we will see what we can find for you mate ? ")
	fs.createReadStream('list.csv')
	.pipe(csv({}))
	.on('data', (data) => results_output.push(data))
	.on('end', async(recommencer) => {
		for(var j=0;j<results_output.length;j++){
			var image_path;
			var display = 0;
			JSON.parse(results_output[j].options, (key, value) => {
				if (key == "image")
				{
					image_path = value;
				}
				if (value == clef){
					if (display == 0)
					{
						console.log(image_path);
						display = 1;
					}
				}
			});
		}
		recommencer = await ask("Do you want to continue ? If Yes, Press y : ")
		if( recommencer == 'y')
		{
			setTimeout(main, 1000);	
		}
		else 
		{
			process.exit()
		}
	});
};
function ask(questionText) {
	return new Promise((resolve, reject) => {
	  r1.question(questionText, resolve);
	});
  }
//main()
function FromDirs(){
	fromDir('./image','.jpg');
	fromDir('./image1','.jpg');
	fromDir('./image2','.jpg');
	setTimeout(FromDirs, 5000); // appel des 3 dossiers toutes les secondes task va appeler fromdir 3 fois
}
main();
FromDirs();