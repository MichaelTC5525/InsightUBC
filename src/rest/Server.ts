import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		this.express.put("/dataset/:id/:kind", Server.addDataset);

		this.express.delete("/dataset/:id/", Server.removeDataset);

		this.express.post("/query", Server.performQuery);

		this.express.get("/datasets", Server.getDatasets);

	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private static async addDataset(req: Request, res: Response) {
		try {
			console.log(`Server::addDataset(ID = ${req.params.id}, KIND = ${req.params.kind})`);
			let insightFacade = new InsightFacade();

			// Perform conversion from raw buffer string to base64 encoding for InsightFacade
			const content: string = Buffer.from(req.body).toString("base64");

			await insightFacade.addDataset(req.params.id, content, req.params.kind as InsightDatasetKind)
				.then((result: string[]) => {
					res.status(200).json({result: result});
				}).catch((error: any) => {
					res.status(400).json({error: error});
				});
		} catch (err: any) {
			res.status(400).json({error: err});
		}
	}

	private static async removeDataset(req: Request, res: Response) {
		try {
			console.log(`Server::removeDataset(${req.params.id})`);
			let insightFacade = new InsightFacade();
			await insightFacade.removeDataset(req.params.id)
				.then((result: string) => {
					res.status(200).json({result: result});
				}).catch((error: any) => {
					if (error instanceof NotFoundError) {
						res.status(404).json({error: error});
					} else {
						res.status(400).json({error: error});
					}
				});
		} catch (err: any) {
			res.status(400).json({error: err});
		}
	}

	private static async performQuery(req: Request, res: Response) {
		try {
			console.log("Server::performQuery()");
			let insightFacade = new InsightFacade();
			await insightFacade.performQuery(req.body)
				.then((result: any[]) => {
					res.status(200).json({result: result});
				}).catch((error: any) => {
					res.status(400).json({error: error});
				});
		} catch (err: any) {
			res.status(400).json({error: err});
		}
	}

	private static async getDatasets(req: Request, res: Response) {
		try {
			console.log("Server::getDatasets()");
			let insightFacade = new InsightFacade();
			await insightFacade.listDatasets().then((result: InsightDataset[]) => {
				res.status(200).json({result: result});
			});
		} catch (err: any) {
			// Should be unreachable in most cases, listDatasets() always resolves; present only for try-catch block
			res.status(400).json({error: err});
		}
	}
}
