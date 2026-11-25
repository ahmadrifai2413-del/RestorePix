# Photograph credits

The hero is a newly generated cinematic landscape. The reference screenshot supplied by the user guided its composition.

The feature photographs below come from the sample data distributed with scikit-image. Source links open the dataset documentation, including original credits and usage terms.

| Asset | Photograph | Credit and reuse terms |
| --- | --- | --- |
| restore.webp | Photographer with a tripod | Lav Varshney, CC0. [Camera](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.camera) |
| light.webp | Falcon 9 launch at dusk | SpaceX, released into the public domain. [Rocket](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.rocket) |
| denoise.webp | Hubble eXtreme Deep Field | NASA, public-domain image as documented by scikit-image. [Hubble eXtreme Deep Field](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.hubble_deep_field) |
| color.webp and both comparison JPEGs | Coffee at Pikolo Espresso Bar | Rachel Michetti, CC0. [Coffee](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.coffee) |
| sharpen.webp | Chelsea the cat | Stefan van der Walt, CC0. [Chelsea](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.chelsea) |
| upscale.webp | Astronaut Eileen Collins | NASA Great Images, public domain. [Astronaut](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut) |

## Homepage comparison

The before photograph is a controlled, darkened version of the coffee image. OpenCV reads that JPEG, applies a gamma curve, and blends in a mild local contrast adjustment on the Lab luminance channel to create the after photograph. Both panels show the same full 600 × 400 frame. The feature-card illustrations are editorial crops.

Run the following command from the project root with the backend dependencies installed.

```bash
python datasets/prepare_showcase.py
```
