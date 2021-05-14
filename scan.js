var path = require('path'), fs=require('fs');
var ExifImage = require('exif').ExifImage;
const sharp = require("sharp");
const ObjectsToCsv = require('objects-to-csv');
const folder_out = 'image_resized\\';
const csv = require('csv-parser');
const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
const results = [];
const results_output = [];

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

function main(){
console.log('Hello you can add a word and we will see what we can find for you mate');
rl.question('Question ? ', answer => {
	fs.appendFile('file.txt', answer, err => {
	  if (err) throw err;
	  console.log('Let us search');
	  fs.createReadStream('list.csv')
	  .pipe(csv({}))
	  .on('data', (data) => results_output.push(data))
	  .on('end', () => {
		for(var j=0;j<results.length;j++){
			var options = JSON.parse(results[j].exifData);
			if (options.ifd1MaxEntries.includes(answer))
			{
				console.log('found')
				var options = JSON.parse(results_output[j].options)
				console.log(options.image);
			}
			else
			{
				console.log(results_output[j].exifData)
			}
		}
	  })
	rl.close();
	})
  
  });


}


//main()
function FromDirs(){
	fromDir('./image','.jpg');
	//fromDir('./image1','.jpg');
	//fromDir('./image2','.jpg');
	setTimeout(FromDirs, 5000); // appel des 3 dossiers toutes les secondes task va appeler fromdir 3 fois
}

FromDirs();
main();