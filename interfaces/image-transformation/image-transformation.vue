<template>
	<v-notice v-if="!relationInfo" type="warning">
		{{ t("relationship_not_setup") }}
	</v-notice>
	<div v-else class="image" :class="[width, { crop }]">
		<v-skeleton-loader v-if="loading" type="input-tall" />

		<v-notice
			v-else-if="disabled && !image"
			class="disabled-placeholder"
			center
			icon="block"
		>
			{{ t("disabled") }}
		</v-notice>

		<div
			v-else-if="image"
			class="image-preview"
			:class="{ 'is-svg': image.type && image.type.includes('svg') }"
		>
			<div v-if="imageError || !src" class="image-error">
				<v-icon
					large
					:name="
						imageError === 'UNKNOWN'
							? 'error_outline'
							: 'info_outline'
					"
				/>

				<span class="message">
					{{ t(`errors.${imageError}`) }}
				</span>
			</div>

			<v-image
				v-else-if="image.type.startsWith('image')"
				:src="src"
				:width="image.width"
				:height="image.height"
				alt=""
				role="presentation"
				@error="imageErrorHandler"
			/>

			<div v-else class="fallback">
				<v-icon-file :ext="ext" />
			</div>

			<div class="shadow" />

			<div
				v-if="!disabled && imageTransformationInfo && image"
				class="actions"
			>
				<v-button
					v-tooltip="t('download')"
					icon
					rounded
					:href="downloadSrc"
					:download="
						imageTransformationInfo.filename_download ||
						image.filename_download
					"
				>
					<v-icon name="file_download" />
				</v-button>
				<v-button
					v-tooltip="t('image_transformation_edit_details')"
					icon
					rounded
					:disabled="!imageTransformationInfo?.id"
					@click="editImageTransformationDetails = true"
				>
					<v-icon name="open_in_new" />
				</v-button>
				<v-button
					v-tooltip="t('edit_image')"
					icon
					rounded
					@click="editImageEditor = true"
				>
					<v-icon name="tune" />
				</v-button>
				<v-button
					v-tooltip="t('deselect')"
					icon
					rounded
					@click="deselect"
				>
					<v-icon name="close" />
				</v-button>
			</div>

			<div class="info">
				<div class="title">{{ image.title }}</div>
				<div class="meta">{{ meta }}</div>
			</div>

			<drawer-item
				v-if="
					!disabled &&
					relationInfo &&
					imageTransformationInfo?.id &&
					image
				"
				v-model:active="editImageTransformationDetails"
				:collection="relationInfo.relatedCollection.collection"
				:primary-key="imageTransformationInfo.id"
				:edits="edits"
				@input="update"
			>
				<template #actions>
					<v-button
						secondary
						rounded
						icon
						:download="
							imageTransformationInfo.filename_download ||
							image.filename_download
						"
						:href="downloadSrc"
					>
						<v-icon name="download" />
					</v-button>
				</template>
			</drawer-item>

			<image-editor
				v-if="!disabled && image"
				:id="image.id"
				v-model="editImageEditor"
				:transformation-info="imageTransformationEditorDetails"
				:transformation-collection="imageTransformationCollection"
				@refresh="refresh"
				@replace-image="replaceImage($event.id)"
				@update-transformation-info="updateImageTransformationInfo"
			/>
		</div>
		<v-upload
			v-else
			from-library
			from-url
			:folder="folder"
			@input="replaceImage($event.id)"
		/>
	</div>
</template>

<script setup lang="ts">
import { useApi, useStores } from "@directus/extensions-sdk";
import { Collection, Field, Relation } from "@directus/shared/types";
import { getEndpoint } from "@directus/shared/utils";
import { merge } from "lodash";
import { computed, ref, Ref, toRefs, watch } from "vue";
import { useI18n } from "vue-i18n";
import extensions from "./extensions.json";
import ImageEditor from "./image-editor.vue";
import { addTokenToURL } from "./utils/add-token-to-url";
import { getRootPath } from "./utils/get-root-path";
import { unexpectedError } from "./utils/unexpected-error";

type RelationM2O = {
	relation: Relation;
	relatedCollection: Collection;
	relatedPrimaryKeyField: Field;
	type: "m2o";
};

type RelationQuerySingle = {
	fields: string[];
};

const props = withDefaults(
	defineProps<{
		value?: string | number | null | Record<string, any>;
		disabled?: boolean;
		folder?: string;
		collection: string;
		primaryKey: string;
		field: string;
		width: string;
		crop?: boolean;
	}>(),
	{
		value: () => null,
		disabled: false,
		crop: true,
		folder: undefined,
	}
);

const emit = defineEmits(["input"]);

const api = useApi();

const imageTransformationID = computed({
	get: () => props.value ?? null,
	set: (value) => {
		emit("input", value);
	},
});

const imageTransformationQuery = ref<RelationQuerySingle>({
	fields: [
		"x",
		"y",
		"width",
		"height",
		"image_transformations",
		"filename_download",
		"file_id.id",
		"file_id.modified_on",
		"file_id.filename_download",
		"file_id.type",
		"file_id.width",
		"file_id.height",
	],
});

const { collection, field } = toRefs(props);
const { relationInfo } = useRelationM2O(collection, field);
const {
	displayItem: imageTransformationInfo,
	loading,
	update,
	remove,
	refresh,
} = useRelationSingle(
	imageTransformationID,
	imageTransformationQuery,
	relationInfo
);

const fileID = computed({
	get() {
		if (!imageTransformationInfo.value) return null;
		return imageTransformationInfo.value.file_id;
	},
	set(newVal) {
		return newVal;
	},
});

const { item: file } = useItem(ref("directus_files"), fileID);

const image = computed(() => {
	// Note: it is a preloaded file row, not file ID
	if (
		imageTransformationInfo.value &&
		typeof imageTransformationInfo.value.file_id === "object"
	)
		return imageTransformationInfo.value.file_id;

	if (file.value) return file.value;

	return null;
});

const imageTransformationCollection = computed(
	() => relationInfo.value?.relatedCollection.collection
);

const imageTransformationEditorDetails = computed(() => {
	let coordinates = null;
	if (
		imageTransformationInfo.value &&
		imageTransformationInfo.value.x != null &&
		imageTransformationInfo.value.y != null &&
		imageTransformationInfo.value.height != null &&
		imageTransformationInfo.value.width != null
	) {
		coordinates = {
			x: imageTransformationInfo.value.x,
			y: imageTransformationInfo.value.y,
			width: imageTransformationInfo.value.width,
			height: imageTransformationInfo.value.height,
		};
	}
	const primaryKey = props.primaryKey == "+" ? null : props.primaryKey;

	return {
		coordinates: coordinates,
		imageTransformations:
			imageTransformationInfo.value?.image_transformations,
		collection: collection.value,
		transformationCollection: imageTransformationCollection.value || null,
		id: imageTransformationID.value || null,
		fileID: fileID.value || null,
		item: primaryKey,
	};
});

const { t, n, te } = useI18n();

const editDrawerActive = ref(false);
const imageError = ref<string | null>(null);

const src = computed(() => {
	if (!image.value || !imageTransformationInfo.value) return null;

	if (image.value.type.includes("image")) {
		let url = `/assets/${image.value.id}?cache-buster=${image.value.modified_on}`;
		if (imageTransformationInfo.value.image_transformations) {
			url = applyImageTransformationsToUrl(url);
		}
		return addTokenToURL(url, api);
	}

	return null;
});

const ext = computed(() =>
	image.value ? getExtensionFromType(image.value.type) : "unknown"
);

const downloadSrc = computed(() => {
	let url = `${getRootPath()}assets/${image.value.id}`;
	if (!imageTransformationInfo.value) {
		return addTokenToURL(url, api);
	} else {
		url = applyImageTransformationsToUrl(url, "?");
		return addTokenToURL(url, api);
	}
});

const meta = computed(() => {
	if (!imageTransformationInfo.value || !image.value) return null;

	const { type, width: originalWidth, height: originalHeight } = image.value;
	const width = imageTransformationInfo.value.width;
	const height = imageTransformationInfo.value.height;

	let dimensions = width && height ? `${n(width)}x${n(height)}` : null;
	if (!dimensions && originalWidth && originalHeight)
		dimensions = `${n(originalWidth)}x${n(originalHeight)}`;

	const properties = [
		imageTransformationInfo.value.filename_download,
		dimensions,
		type,
	];
	return properties.filter((x) => !!x).join(" • ");
});

const editImageTransformationDetails = ref(false);
const editImageEditor = ref(false);

function applyImageTransformationsToUrl(url: string, paramStart = "&"): string {
	let readyTransformations = [];

	if (
		imageTransformationInfo.value &&
		imageTransformationInfo.value.image_transformations
	) {
		if (imageTransformationInfo.value.image_transformations.flipY) {
			readyTransformations.push('["flop"]');
		}
		if (imageTransformationInfo.value.image_transformations.flip) {
			readyTransformations.push('["flip"]');
		}

		const rotation =
			imageTransformationInfo.value.image_transformations.rotate;
		if (rotation != null && rotation != 0) {
			readyTransformations.push(`["rotate", ${rotation}]`);
		}
	}

	const coordinates = imageTransformationEditorDetails.value.coordinates;
	if (coordinates) {
		readyTransformations.push(
			`["extract",{"width": ${coordinates.width}, "height": ${coordinates.height}, "left": ${coordinates.x}, "top": ${coordinates.y}}]`
		);
	}

	if (readyTransformations.length > 0) {
		url += `${paramStart}transforms=[${readyTransformations.join(",")}]`;
	}

	return url;
}

async function imageErrorHandler() {
	if (!src.value) return;
	try {
		await api.get(src.value);
	} catch (err: any) {
		imageError.value = err.response?.data?.errors[0]?.extensions?.code;

		if (!imageError.value || !te("errors." + imageError.value)) {
			imageError.value = "UNKNOWN";
		}
	}
}

async function replaceImage(item: string | number) {
	try {
		fileID.value = item;
		imageTransformationID.value = {
			file_id: item,
			collection: collection.value,
		};
	} catch (err: any) {
		unexpectedError(err, useStores);
	}
}

function updateImageTransformationInfo(payload: {
	coordinates: object;
	image_transformations: object;
}) {
	if (
		imageTransformationID.value &&
		typeof imageTransformationID.value === "object"
	)
		imageTransformationID.value = {
			...imageTransformationID.value,
			...payload,
		};
	if (
		imageTransformationID.value &&
		(typeof imageTransformationID.value === "string" ||
			typeof imageTransformationID.value === "number")
	)
		imageTransformationID.value = {
			id: imageTransformationID.value,
			...payload,
		};
}

function deselect() {
	remove();

	loading.value = false;
	editDrawerActive.value = false;
	editImageTransformationDetails.value = false;
	editImageEditor.value = false;
}

const edits = computed(() => {
	if (
		!imageTransformationID.value ||
		typeof imageTransformationID.value !== "object"
	)
		return {};
	return imageTransformationID.value;
});

// functions extracted from core

function useItem(collection: Ref<string>, primaryKey: Ref<string | null>) {
	const item = ref<Record<string, any> | null>(null);

	watch([collection, primaryKey], getItem, { immediate: true });

	return { item };

	async function getItem() {
		if (!primaryKey.value) {
			item.value = null;
			return;
		}

		try {
			const baseEndpoint = getEndpoint(collection.value);
			const itemKey = encodeURIComponent(primaryKey.value);
			const itemEndpoint = `${baseEndpoint}/${itemKey}`;
			const response = await api.get(itemEndpoint);
			item.value = response.data.data;
		} catch (err: any) {
			unexpectedError(err, useStores);
		} finally {
		}
	}
}

function useRelationM2O(collection: Ref<string>, field: Ref<string>) {
	const { useRelationsStore, useCollectionsStore, useFieldsStore } =
		useStores();
	const relationsStore = useRelationsStore();
	const collectionsStore = useCollectionsStore();
	const fieldsStore = useFieldsStore();

	const relationInfo = computed<RelationM2O | undefined>(() => {
		const relations = relationsStore.getRelationsForField(
			collection.value,
			field.value
		);

		if (relations.length === 0) return undefined;

		const relation = relations[0];

		return {
			relation: relation,
			relatedCollection: collectionsStore.getCollection(
				relation.related_collection as string
			),
			relatedPrimaryKeyField: fieldsStore.getPrimaryKeyFieldForCollection(
				relation.related_collection as string
			),
			type: "m2o",
		} as RelationM2O;
	});

	console.log({ relationInfo });

	return { relationInfo };
}

function useRelationSingle(
	value: Ref<number | string | Record<string, any> | null>,
	previewQuery: Ref<RelationQuerySingle>,
	relation: Ref<RelationM2O | undefined>
) {
	const displayItem = ref<Record<string, any> | null>(null);
	const loading = ref(false);

	watch([value, previewQuery, relation], getDisplayItems, {
		immediate: true,
	});

	return { update, remove, refresh, displayItem, loading };

	function update(item: Record<string, any> | string | number) {
		if (!relation.value) return;

		const pkField = relation.value.relatedPrimaryKeyField.field;

		// make sure when updating from an existing primary key, we also have it inside the changes
		if (
			value.value &&
			typeof item === "object" &&
			pkField in item === false
		) {
			const existingPk: string | number =
				typeof value.value === "object"
					? value.value[pkField]
					: value.value;

			item[pkField] = existingPk;
		}

		value.value = item;
	}

	function remove() {
		value.value = null;
	}

	async function refresh() {
		await getDisplayItems();
	}

	async function getDisplayItems() {
		const val = value.value;

		if (!val) {
			displayItem.value = null;
			return;
		}

		if (!relation.value) return;

		const relatedCollection = relation.value.relatedCollection.collection;
		const pkField = relation.value.relatedPrimaryKeyField.field;

		const id =
			typeof val === "object"
				? val[relation.value.relatedPrimaryKeyField.field]
				: val;

		if (!id) {
			displayItem.value = val as Record<string, any>;
			return;
		}

		const fields = new Set(previewQuery.value.fields);
		fields.add(pkField);

		loading.value = true;

		try {
			const response = await api.get(
				getEndpoint(relatedCollection) + `/${encodeURIComponent(id)}`,
				{
					params: {
						fields: Array.from(fields),
					},
				}
			);

			if (typeof val === "object") {
				displayItem.value = merge({}, response.data.data, val);
			} else {
				displayItem.value = response.data.data;
			}
		} catch (err: any) {
			// if the item has a manually entered primary key, we can ignore the error
			if (
				typeof val === "object" &&
				err.response &&
				err.response.status === 403
			) {
				displayItem.value = val;
			} else {
				unexpectedError(err, useStores);
			}
		} finally {
			loading.value = false;
		}
	}
}

function getExtensionFromType(type: string) {
	return extensions[type as keyof typeof extensions] || null;
}
</script>

<style lang="scss" scoped>
.image-preview {
	position: relative;
	width: 100%;
	height: var(--input-height-tall);
	overflow: hidden;
	background-color: var(--background-normal-alt);
	border-radius: var(--border-radius);
}

img {
	z-index: 1;
	width: 100%;
	height: 100%;
	max-height: inherit;
	object-fit: contain;
}

.is-svg {
	padding: 32px;

	img {
		object-fit: contain;
	}
}

.image-error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--foreground-subdued);
	background-color: var(--background-normal);
	padding: 32px;

	.v-icon {
		margin-bottom: 6px;
	}

	.message {
		max-width: 300px;
		padding: 0 16px;
		text-align: center;
	}
}
.image-preview {
	.shadow {
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 2;
		width: 100%;
		height: 40px;
		overflow: hidden;
		line-height: 1;
		white-space: nowrap;
		text-overflow: ellipsis;
		background: linear-gradient(
			180deg,
			rgb(38 50 56 / 0) 0%,
			rgb(38 50 56 / 0.25) 100%
		);
		transition: height var(--fast) var(--transition);
	}

	.actions {
		--v-button-color: var(--foreground-subdued);
		--v-button-background-color: var(--white);
		--v-button-color-hover: var(--foreground-normal);
		--v-button-background-color-hover: var(--white);

		position: absolute;
		top: calc(50% - 32px);
		left: 0;
		z-index: 3;
		display: flex;
		justify-content: center;
		width: 100%;

		.v-button {
			margin-right: 12px;
			transform: translateY(10px);
			opacity: 0;
			transition: var(--medium) var(--transition);
			transition-property: opacity transform;

			@for $i from 0 through 4 {
				&:nth-of-type(#{$i + 1}) {
					transition-delay: $i * 25ms;
				}
			}
		}

		.v-button:last-child {
			margin-right: 0px;
		}
	}

	.info {
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 3;
		width: 100%;
		padding: 8px 12px;
		line-height: 1.2;
	}

	.title {
		color: var(--white);
	}

	.meta {
		height: 17px;
		max-height: 0;
		overflow: hidden;
		color: rgb(255 255 255 / 0.75);
		transition: max-height var(--fast) var(--transition);
	}
}

.image-preview:focus-within,
.image-preview:hover {
	.shadow {
		height: 100%;
		background: linear-gradient(
			180deg,
			rgb(38 50 56 / 0) 0%,
			rgb(38 50 56 / 0.5) 100%
		);
	}

	.actions .v-button {
		transform: translateY(0px);
		opacity: 1;
	}

	.meta {
		max-height: 17px;
	}
}

.image {
	&.full,
	&.fill {
		.image-preview {
			height: auto;
			max-height: 400px;
		}
	}

	&.crop {
		.image-preview {
			img {
				object-fit: cover;
			}
		}
	}
}

.disabled-placeholder {
	height: var(--input-height-tall);
}

.fallback {
	background-color: var(--background-normal);
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--input-height-tall);
	border-radius: var(--border-radius);
}
</style>
