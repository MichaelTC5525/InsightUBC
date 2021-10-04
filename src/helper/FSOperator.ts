import * as fs from "fs-extra";
import JSZip from "jszip";

export default class FSOperator {

	public validateAndWriteFiles(folder: string, contentZip: JSZip, id: string): void {
		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			contentZip.file(file.name)?.async("string")
				.then(function (data) {
					const obj = JSON.parse(data);
					if (obj.result === undefined) {
						throw new Error("Missing 'result' keyword in file content.");
					}

					if (folder === "courses") {
						for (let r of obj.result) {
							if (r.Subject === undefined ||
								r.Course === undefined ||
								r.Avg === undefined ||
								r.Professor === undefined ||
								r.Title === undefined ||
								r.Pass === undefined ||
								r.Fail === undefined ||
								r.Audit === undefined ||
								r.id === undefined ||
								r.Year === undefined) {
								// TODO: Placeholder, should track if no sections valid across all dataset files
								throw new Error();
							}

							// Start crafting the section representation in DB system?


						}
					} else if (folder === "rooms") {
						// TODO: Behaviour not yet defined; placeholder code
						for (let r of obj.result) {
							if (r.Room === undefined) {
								// TODO: Placeholder
								throw new Error();
							}
						}
					} else {
						throw new Error("Unsupported directory name");
					}
				});
		});
	}


	public writeFilesWithData(folder: string, contentZip: JSZip): void {
		// Read each of the files within the courses directory, if it exists
		contentZip.folder(folder)?.forEach(function (relativePath, file) {
			contentZip.file(file.name)?.async("string")
				.then(function (data) {
					fs.writeFile("./data/${id}/" + file.name, data);
				});
		});
	}
}
