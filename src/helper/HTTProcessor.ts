import http from "http";

export default class HTTProcessor {

	public makeHTTPromise(address: string): Promise<any> {
		return new Promise<any>((resolve) => {
			// Credits to https://nodejs.org/en/knowledge/HTTP/clients/how-to-create-a-HTTP-request/
			const options = {
				host: "cs310.students.cs.ubc.ca",
				path: "/api/v1/project_team115/" + address,
				port: 11316,
				method: "GET",
			};

			let request = http.request(options, (response: any) => {
				let ret: [number | null, number | null] = [null, null];
				let data: string = "";
				response.on("data", (chunk: any) => {
					data += chunk;
				});
				response.on("end", () => {
					if (response.statusCode !== 200) {
						resolve(ret);
					}
					let geoResponse = JSON.parse(data);
					if (geoResponse.lat && geoResponse.lon) {
						ret[0] = geoResponse.lat;
						ret[1] = geoResponse.lon;
					} else {
						ret[0] = null;
						ret[1] = null;
					}
				});

				resolve(ret);
			});

			request.on("error", (error: any) => {
				return [null, null];
			});

			request.end();
		});
	}

}
