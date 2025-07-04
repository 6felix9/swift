import fs from "node:fs/promises";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Cross-Origin-Opener-Policy",
						value: "same-origin",
					},
					{
						key: "Cross-Origin-Embedder-Policy",
						value: "require-corp",
					},
				],
			},
		];
	},
	webpack: (config, { isServer }) => {
		// Only run on server during build
		if (isServer) {
			copyFiles();
		}
		return config;
	},
};

export default nextConfig;

async function copyFiles() {
	try {
		await fs.access("public/");
	} catch {
		await fs.mkdir("public/", { recursive: true });
	}

	const wasmFiles = (
		await fs.readdir("node_modules/onnxruntime-web/dist/")
	).filter((file) => path.extname(file) === ".wasm");

	await Promise.all([
		fs.copyFile(
			"node_modules/@ricky0123/vad-web/dist/vad.worklet.bundle.min.js",
			"public/vad.worklet.bundle.min.js",
		),
		fs.copyFile(
			"node_modules/@ricky0123/vad-web/dist/silero_vad_v5.onnx",
			"public/silero_vad_v5.onnx",
		),
		...wasmFiles.map((file) =>
			fs.copyFile(
				`node_modules/onnxruntime-web/dist/${file}`,
				`public/${file}`,
			)
		),
	]);
}
