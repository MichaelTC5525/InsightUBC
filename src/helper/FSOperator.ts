import * as fs from "fs-extra";
import JSZip from "jszip";

export default class FSOperator {
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
