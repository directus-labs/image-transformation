export function addTokenToURL(url: string, api: any) {
	const accessToken = getToken();
	if (!accessToken) return url;
	return addQueryToPath(url, {
		access_token: accessToken,
	});

	function getToken() {
		return (
			api.defaults?.headers?.["Authorization"]?.split(" ")[1] ||
			api.defaults?.headers?.common?.["Authorization"]?.split(" ")[1] ||
			null
		);
	}

	function addQueryToPath(
		path: string,
		query: Record<string, string>
	): string {
		const queryParams = new URLSearchParams(path.split("?")[1] || "");

		for (const [key, value] of Object.entries(query)) {
			queryParams.set(key, value);
		}

		return path.split("?")[0] + "?" + queryParams;
	}
}
