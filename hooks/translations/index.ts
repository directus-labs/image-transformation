import { defineHook } from "@directus/extensions-sdk";
import { merge, keyBy, values } from "lodash";

const extensionTranslations = [
	// interface options
	{
		key: "image_transformation_name",
		translations: {
			"en-US": "Image Transformation",
		},
	},
	{
		key: "image_transformation_description",
		translations: {
			"en-US": "Select or upload an image",
		},
	},
	{
		key: "image_transformation_collection",
		translations: {
			"en-US": "Image Transformation Collection",
		},
	},
	{
		key: "image_transformation_crop",
		translations: {
			"en-US": "Crop to Fit",
		},
	},
	{
		key: "image_transformation_crop_label",
		translations: {
			"en-US": "Crop image as needed",
		},
	},
	// component
	{
		key: "image_transformation_edit_details",
		translations: {
			"en-US": "Edit Image Transformation Details",
		},
	},
];

export default defineHook(
	async ({ init }, { services, database, getSchema, logger }) => {
		const { SettingsService } = services;

		init("app.after", async () => {
			try {
				const schema = await getSchema({ database });
				const settingsService = new SettingsService({
					schema,
					knex: database,
				});

				// add translation keys used by this extension
				const settings = await settingsService.readSingleton({
					fields: ["translation_strings"],
				});
				const translationStrings: Record<string, any>[] =
					settings.translation_strings;
				if (translationStrings) {
					const mergedTranslationsObject = merge(
						keyBy(translationStrings, "key"),
						keyBy(extensionTranslations, "key")
					);

					await settingsService.upsertSingleton({
						translation_strings: values(mergedTranslationsObject),
					});
				} else {
					await settingsService.upsertSingleton({
						translation_strings: extensionTranslations,
					});
				}

				logger.info(
					"Image Transformation extension initialized successfully"
				);
			} catch (err) {
				logger.error(err);
			}
		});
	}
);
