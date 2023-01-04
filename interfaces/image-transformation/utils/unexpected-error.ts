import { useI18n } from "vue-i18n";

export function unexpectedError(error: any, useStores: any): void {
	const { t } = useI18n();
	const { useNotificationsStore } = useStores();
	const notificationsStore = useNotificationsStore();

	const code =
		error?.response?.data?.errors?.[0]?.extensions?.code ||
		error?.extensions?.code ||
		"UNKNOWN";

	// eslint-disable-next-line no-console
	console.warn(error);

	notificationsStore.add({
		title: t(`errors.${code}`),
		type: "error",
		dialog: true,
		error,
	});
}
