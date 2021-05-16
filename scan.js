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

/* Worker Thread */
function fromDir(startPath,filter){
	var list = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath); /* Le dossier n'existe pas */
        return;
    }

    var files=fs.readdirSync(startPath);
	fs.createReadStream('list.csv') /* Permet de lire le fichier csv */
	.pipe(csv({}))
	.on('data', (data) => results.push(data))
	.on('end', () => {
		console.log(files);
		file_for_sloop:
		for(var i=0;i<files.length;i++){ /* Itere sur les differents fichiers du dossier */
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
						continue file_for_sloop; /* Petit continue sur plusieurs boucles via un label */
					}
				}
				(async function () { // asynchrone 
					try {
						// Get file name
						const words = filename.split('\\'); // find last Index Of \
						var path_out = folder_out.concat(words[1]); /* Concatene le nom du fichier au nom de dossier */
						// Resizes the image
						sharp(filename).resize(50, 50).png().toFile(path_out); /* Resize l'image et l'envoi dans le bon dossier */
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
						csv.toDisk('./list.csv', { append: true }); /* Ecrit sur le fichier CSV */
					}
				} catch (error) {
					console.log('Error: ' + error.message);
				}
			};
		};
	});
};

/* Main thread */
async function main(){
	const results_output = [];
	var clef = await ask("Hello put a keyword :)")
	fs.createReadStream('list.csv')
	.pipe(csv({}))
	.on('data', (data) => results_output.push(data))
	.on('end', async(recommencer) => { /* Sans le async on ne peut pas appeler la fonction ask */
		for(var j=0;j<results_output.length;j++){ /* Itere sur les images en base */
			var image_path;
			var display = 0;
			JSON.parse(results_output[j].options, (key, value) => { /* Permet de parser les metadatas */
				if (key == "image")
				{
					image_path = value; /* Recupere la valeur du chemin de l'image */
				}
				if (value == clef){
					if (display == 0)
					{
						console.log(image_path);
						display = 1; 
						/* Si la recherche trouve une correspondre et affiche l'image on passe à celle d'après */
						/* Sans cette dernière on afficherait plusieurs fois la même image */
					}
				}
			});
		}
		/* Appel de la fonction qui permet de saisir un utilisateur */
		recommencer = await ask("Do you want to continue ? If Yes, Press y : ")
		if( recommencer == 'y')
		{
			/* Permet de relancer la fonction si l'utilisateur le souhaite */
			setTimeout(main, 1000);	
		}
		else 
		{
			/* Fin du programme */
			process.exit()
		}
	});
};

/* Fonction qui va permettre de demander à l'utilisateur de saisir un key word pour la recherche */
function ask(questionText) {
	return new Promise((resolve, reject) => {
	  r1.question(questionText, resolve);
	});
  }

/* Fonction qui va permettre d'appeler les trois workers toutes les 5 secondes */
function FromDirs(){
	fromDir('./image','.jpg');
	fromDir('./image1','.jpg');
	fromDir('./image2','.jpg');
	setTimeout(FromDirs, 5000); // appel des 3 dossiers toutes les secondes task va appeler fromdir 3 fois
}

/* Appel des fonctions */
main();
FromDirs();