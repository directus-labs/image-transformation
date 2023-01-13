# 🖼️ Image Transformations Extension

## How to use it?

1. Go to the data model configuration of `Directus Files` (`/admin/settings/data-model/directus_files`)

2. Click on `Create Field in Advanced Mode` -> `Many to Any Relationship`

3. In schema tab, pick a key, e.g., `image_transformations`

4. In relations tab, create a relationship as shown in the image (feel free to select any other related collections):

![Screenshot 2023-01-13 at 13 54 55](https://user-images.githubusercontent.com/54835674/212324959-077028c8-4c29-4dcc-b900-fa1ef2649161.png)

5. Afterwards, go to the settings of `image_transformations` (the junction collection created in the previous step) and create the following fields:

    - `width`: **input of type integer**, width of the resulting transformation

    - `height`: **input of type integer**, height of the resulting transformation
    
    - `x`: **input of type integer**, x coordinate of the transformation within the original image

    - `y`: **input of type integer**, y coordinate of the transformation within the original image

    - `filename_download`: **input of type string**, download name of the image transformation

    - `image_transformations`: **code field of type JSON**, JSON object containing image transformations: a boolean flipY for indicating whether the original image was flipped by Y axis, a boolean flipX for indicating whether the original image was flipped by X axis, and an integer field rotate keeping negative/positive degrees of image rotation

6. You are all set! 🎉 Now, you can use the this extension on the related collections from step 4 by creating a new relational field `Image Transformation`:

![Screenshot 2023-01-13 at 14 07 17](https://user-images.githubusercontent.com/54835674/212327033-b7c71188-2413-441f-88d1-d426213a7c88.png)

**Results:**

![Screenshot 2023-01-13 at 14 11 48](https://user-images.githubusercontent.com/54835674/212327808-f0329ec6-e685-4698-bba3-31a6236cbd03.png)