import { defineInterface } from "@directus/extensions-sdk";
import InterfaceImageTransformation from "./image-transformation.vue";
import PreviewSVG from "./preview.svg";

export default defineInterface({
	id: "file-image-transformation",
	name: "$t:image_transformation_name",
	description: "$t:image_transformation_description",
	icon: "insert_photo",
	component: InterfaceImageTransformation,
	types: ["uuid"],
	localTypes: ["m2o"],
	group: "relational",
	relational: true,
	options: [
		{
			field: "folder",
			name: "$t:interfaces.system-folder.folder",
			type: "uuid",
			meta: {
				width: "half",
				interface: "system-folder",
				note: "$t:interfaces.system-folder.field_hint",
			},
			schema: {
				default_value: undefined,
			},
		},
		{
			field: "crop",
			name: "$t:image_transformation_crop",
			type: "boolean",
			meta: {
				width: "half",
				interface: "boolean",
				options: {
					label: "$t:image_transformation_crop_label",
				},
			},
			schema: {
				default_value: true,
			},
		},
	],
	recommendedDisplays: ["image"],
	preview: PreviewSVG,
});
