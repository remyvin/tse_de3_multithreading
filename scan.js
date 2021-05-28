var path = 				require('path'), fs=require('fs');
var ExifImage = 		require('exif').ExifImage;
const sharp = 			require("sharp");
const ObjectsToCsv = 	require('objects-to-csv');
const csv =    			require('csv-parser');
var readline = 			require('readline');
var mongoose = 			require('mongoose');

sharp.cache({files : 0}) // necessaire sous windows a cause des locks de fichier garde en cache https://github.com/lovell/sharp/issues/346

// Inclusion de Mongoose
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://localhost/key_word', { useNewUrlParser: true });

var keyWordSchema = new mongoose.Schema({
	Filename : String, 
	Keyword : String
});

var keyWordModel = mongoose.model('keyword', keyWordSchema);

const folder_out = 'image_resized\\';

const r1 = readline.createInterface({

	input: process.stdin,
	output: process.stdout
});

/* Worker Thread */
function Process_folder(startPath, output_path, extension, tasks = []){
	var list = [];
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath); /* Le dossier n'existe pas */
        return;
    }

	var files=fs.readdirSync(startPath);
	for(const file of files)
	{
		const file_path = path.join(startPath, file);
		const file_output_path = path.join(output_path, file);
		var stat = fs.lstatSync(file_path);
		if (stat.isDirectory()){
			fs.mkdirSync(file_output_path);
			Process_folder(file_path, file_output_path, extension, tasks);
		}
		else if (file_path.indexOf(extension)>=0) {
			meta_data_file = file_path;
			meta_data_file = meta_data_file.substring(0, meta_data_file.lastIndexOf('.'));
			meta_data_file = meta_data_file.concat('', '.csv');
			if (fs.existsSync(meta_data_file)){
				console.log(meta_data_file);
				// on ajoute l'image à la liste des taches à executer
				tasks.push(
					traitement_image(file_path, meta_data_file, file_output_path)
				);

			}

		};
		// May do : deplacer les fichiers incoherents autre part ?
	}
	return Promise.all(tasks); // on lance toutes les taches et on attend qu'elle soient toutes lancées
	// on sait maintenant que le traitement de toutes les images est termine 

};

// clean directory recursif 
function clean_directory(folder_path){
	var files=fs.readdirSync(folder_path);
	for( const file of files)
	{
		const file_path = path.join(folder_path, file);
		console.log('clearing ' + file_path)
		var stat = fs.lstatSync(file_path);
		if (stat.isDirectory()){
			fs.rmdirSync(file_path, {recursive : true});
		}
		else 
		{
			fs.unlinkSync(file_path, (err) => {
				if (err) {
					console.log("Fichier non supprime :"+err);
				} else {
					console.log('successfully deleted local file');                                
				}
			});
		}
	}
}

/* Main thread */
async function main(){

	var clef = await ask("Hello put a keyword :)")
	var query = keyWordModel.distinct('Filename', { "Keyword" : clef } );
	query.exec(function (err, comms) {
		if (err) { throw err; }
		// On va parcourir le résultat et les afficher joliment
		var comm;
		for (var i = 0, l = comms.length; i < l; i++) {
		  comm = comms[i];
		  console.log('\n');
		  console.log('------------------------------');
		  console.log('Filename : ' + comm);
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

// la fonction constrauit une promise composite qui attend que le csv et l'image soient traités
function traitement_image (image_path, csv_path, image_output_path) { // asynchrone 

	const csv_promise = new Promise(function(resolve, reject){ //la csv promise est une promise qui traite le fichier csv

		fs.readFile(csv_path, 'utf8', function(err, data) {
			if (err) throw err;
			var lines = data.split(/\r?\n/); //lines contient chaque mot clé
			for (i = 0; i< lines.length; i++ )
			{
				var monCommentaire = new keyWordModel({ Filename : image_output_path });
				monCommentaire.Keyword = lines[i];
				monCommentaire.save(function (err) {
					if (err) { throw err; }
					console.log('Commentaire ajouté avec succès !');
				});
	
			}
			resolve();
		});
	}).then(() => console.log(csv_path + ' processed'));
	// resize promise est une promis fournie par sharp qui redimensionne l'image
	const resized_promise = sharp(image_path).resize(50, 50).png().toFile(image_output_path).then(() => console.log(image_path + ' processed'));
	// on veut attendre que les deux promise ( csv et sharp ) soient completes donc on renvoie une promise composite
	return Promise.all([csv_promise, resized_promise]); 
};

/* Fonction qui va permettre d'appeler les trois workers toutes les 5 secondes */
function FromDirs(){
	Process_folder('./image',folder_out, '.jpg').then( () => clean_directory('./image')) ;
	Process_folder('./image1',folder_out, '.jpg').then( () => clean_directory('./image1')) ;
	Process_folder('./image2',folder_out, '.jpg').then( () => clean_directory('./image2')) ;
	setTimeout(FromDirs, 5000); // appel des 3 dossiers toutes les secondes task va appeler fromdir 3 fois
}

/* Appel des fonctions */
main();
FromDirs();