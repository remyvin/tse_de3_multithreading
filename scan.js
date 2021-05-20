var path = 				require('path'), fs=require('fs');
var ExifImage = 		require('exif').ExifImage;
const sharp = 			require("sharp");
const ObjectsToCsv = 	require('objects-to-csv');
const csv =    			require('csv-parser');
var readline = 			require('readline');

// Inclusion de Mongoose
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/key_word', function(err) {
  if (err) { throw err; }
});

var keyWordSchema = new mongoose.Schema({
	Filename : String, 
	Keyword : String
  });

var keyWordModel = mongoose.model('keyword', keyWordSchema);


const folder_out = 'image_resized\\';

const results = [];
const results_mots_cles = [];

const r1 = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var filename_of_txt_file;

/* Worker Thread */
function fromDir(startPath,filter){
	var list = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath); /* Le dossier n'existe pas */
        return;
    }

var files=fs.readdirSync(startPath);
file_for_sloop:
for(var i=0;i<files.length;i++){ /* Itere sur les differents fichiers du dossier */
	var filename=path.join(startPath,files[i]);
	var stat = fs.lstatSync(filename);
	if (stat.isDirectory()){
		continue file_for_sloop; // on laisse les dossiers 
	}
	else if (filename.indexOf(filter)>=0) {
		console.log(filename);
		filename_of_txt_file = filename;
		filename_of_txt_file = filename_of_txt_file.substring(0, filename_of_txt_file.lastIndexOf('.'));
		filename_of_txt_file = filename_of_txt_file.concat('', '.csv');
		if (fs.existsSync(filename_of_txt_file))
		{
			console.log(filename_of_txt_file);
			fs.readFile(filename_of_txt_file, 'utf8', function(err, data) {
				if (err) throw err;
				var lines = data.split(/\r?\n/); //lines contient chaque mot clé
				for (i = 0; i< lines.length; i++ )
				{
					var monCommentaire = new keyWordModel({ Filename : filename });
					monCommentaire.Keyword = lines[i];
					monCommentaire.save(function (err) {
						if (err) { throw err; }
						console.log('Commentaire ajouté avec succès !');
						});
				}
			});
			fs.unlink(filename, (err) => {
				if (err) {
					console.log("Image non supprimee:"+err);
				} else {
					console.log('successfully deleted local image');                                
				};
			});
			fs.unlink(filename_of_txt_file, (err) => {
				if (err) {
					console.log("Texte non :"+err);
				} else {
					console.log('successfully deleted local image');                                
				}
			});

		}
		else
		{
			fs.unlink(filename, (err) => {
				if (err) {
					console.log("Image non supprimee:"+err);
				} else {
					console.log('successfully deleted local image');                                
				};
			});
			continue file_for_sloop;
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
	};
};

var files=fs.readdirSync(startPath);
for(var i=0;i<files.length;i++){ /* Itere sur les differents fichiers du dossier */
	var filename=path.join(startPath,files[i]);
	fs.unlink(filename, (err) => {
		if (err) {
			console.log("Texte non supprime :"+err);
		} else {
			console.log('successfully deleted local image');                                
		}
	});

}

};

/* Main thread */
async function main(){
	const results_output = [];
	var clef = await ask("Hello put a keyword :)")
	var query = keyWordModel.find(null, function (err, comms) {
		if (err) { throw err; }
		// comms est un tableau de hash
		console.log(comms);
	});
	query.exec(function (err, comms) {
		if (err) { throw err; }
		// On va parcourir le résultat et les afficher joliment
		var comm;
		for (var i = 0, l = comms.length; i < l; i++) {
		  comm = comms[i];
		  console.log('------------------------------');
		  console.log('Pseudo : ' + comm.Filename);
		  console.log('------------------------------');
		}
	  });

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