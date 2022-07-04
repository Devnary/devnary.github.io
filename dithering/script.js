(function() {
    
    let DOMimport, DOMcanvas, DOMalgorithm, DOMpalette, DOMcontrast, DOMresolution, DOMjpeg, DOMbrightness, DOMcontrastValue, DOMbrightnessValue, DOMresolutionValue, DOMjpegValue,

        image, width, height, context, imageData, result,

        algorithm = [0, 1],
        palette = 0,
        resolution = 256,

        contrast = 0,
        brightness = 0,
        jpeg = 0;
    
    document.addEventListener("DOMContentLoaded", () => {
        
        DOMimport = document.getElementById("import"),
        DOMcanvas = document.getElementById("canvas"),
        DOMalgorithm = document.getElementById("algorithm"),
        DOMpalette = document.getElementById("palette"),
        DOMcontrast = document.getElementById("contrast"),
        DOMbrightness = document.getElementById("brightness"),
        DOMresolution = document.getElementById("resolution"),
        DOMjpeg = document.getElementById("jpeg"),
        DOMcontrastValue = document.getElementById("contrastValue"),
        DOMbrightnessValue = document.getElementById("brightnessValue"),
        DOMresolutionValue = document.getElementById("resolutionValue"),
        DOMjpegValue = document.getElementById("jpegValue");
        
        document.getElementById("options").style.display = "none",
        DOMcanvas.style.display = "none";
        
        let dropFunc = e => {
            
            e.stopPropagation();
            e.preventDefault();
            
            readFile(e.dataTransfer.files[0]);
        },
            dragOverFunc = e => {
            
            e.stopPropagation();
            e.preventDefault();
            
            e.dataTransfer.dropEffect = "copy";
        };
        
        document.addEventListener("drop", dropFunc);
        document.addEventListener("dragover", dragOverFunc);
        
        context = DOMcanvas.getContext("2d");
        
        dithers.forEach((group, i) => {
            
            let html = `<optgroup label="${group[0]}">`;
            for (let j = 1; j < group.length; j++)
                html += `<option value="${i},${j}">${group[j][0]}</option>`;
            
            DOMalgorithm.innerHTML += html + "</optgroup>";
        });
        
        palettes.forEach((palette, i) => {
            
            DOMpalette.innerHTML += `<option value="${i}">${palette[0]}</option>`;
            Process();
        });
        
        DOMimport.addEventListener("change", e => {
            
            readFile(e.originalTarget.files[0]);
        });
        
        DOMalgorithm.addEventListener("change", () => {
            
            let selected = DOMalgorithm.value.split(",").map(e => parseInt(e));
            
            algorithm[0] = selected[0],
            algorithm[1] = selected[1];
            Process();
        });
        
        DOMpalette.addEventListener("change", () => {
            
            palette = parseInt(DOMpalette.value);
            Process();
        });
        
        DOMcontrast.addEventListener("input", () => {
            
            DOMcontrastValue.innerHTML = DOMcontrast.value.padStart(4, "\u00A0"),
            contrast = parseInt(DOMcontrast.value);
            Process();
        });
        
        DOMbrightness.addEventListener("input", () => {
            
            DOMbrightnessValue.innerHTML = DOMbrightness.value.padStart(4, "\u00A0"),
            brightness = parseInt(DOMbrightness.value);
            Process();
        });
        
        DOMresolution.addEventListener("input", () => {
            
            DOMresolutionValue.innerHTML = DOMresolution.value.padStart(4, "\u00A0"),
            resolution = parseInt(DOMresolution.value);
            Process();
        });
        
        DOMjpeg.addEventListener("input", () => {
            
            DOMjpegValue.innerHTML = DOMjpeg.value.padStart(4, "\u00A0"),
            jpeg = parseInt(DOMjpeg.value);
            Process();
        });
    });
    
    function readFile(file) {
        
        let reader = new FileReader();
        
        reader.addEventListener("load", e => {
            
            image = new Image(),
            image.src = e.target.result;
            image.addEventListener("load", Process);
        });
        reader.readAsDataURL(file);
        
        if (!image) {
            
            document.getElementById("options").style.display = "",
            DOMcanvas.style.display = "";
            document.body.removeChild(document.getElementById("dropFile"));
        }
    }

    function Process() {
        
        if (image) {
            
            DOMcanvas.width  = width  = resolution,
            DOMcanvas.height = height = parseInt(image.height / image.width * resolution);
            
            context.drawImage(image, 0, 0, width, height);
            
            imageData = Contrast(Brightness(context.getImageData(0, 0, width, height), brightness), contrast);
            
            let group = dithers[algorithm[0]],
                colors = palettes[palette][1];
            
            if (algorithm[0] == 0 && algorithm[1] == 1)
                result = imageData;
            else if (algorithm[0] == 0 && algorithm[1] == 2)
                result = typeof colors == "function" ? Threshold(palettes[palette][1]) : PaletteThreshold(palettes[palette][1]);
            else if (algorithm[0] == 1)
                result = typeof colors == "function" ? ErrorDiffusionDithering(group[algorithm[1]][1], palettes[palette][1]) : PaletteErrorDiffusionDithering(group[algorithm[1]][1], palettes[palette][1]);
            else if (algorithm[0] == 2)
                result = typeof colors == "function" ? MatrixDithering(group[algorithm[1]][3], group[algorithm[1]][1], group[algorithm[1]][2], palettes[palette][1]) : PaletteMatrixDithering(group[algorithm[1]][3], group[algorithm[1]][1], group[algorithm[1]][2], palettes[palette][1]);
//             result = CharacterBrailleLike(palettes[palette][1]);
            
            context.putImageData(result, 0, 0);
            if (jpeg > 0)
                DCTArtifact();
        }
    }

    function nearestColor(r, g, b, colors) {
        
        return colors.reduce((p, c) => ((Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b)) < (Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b)) ? c : p));
    }

    function averageColorDistance(palette) {
        
        let v = [];
        for (let i = 0; i < palette.length; i++)
            for (let j = 0; j < palette.length; j++)
                v.push([Math.abs(palette[i][0] - palette[j][0]), Math.abs(palette[i][1] - palette[j][1]), Math.abs(palette[i][2] - palette[j][2])]);
        
        return v.reduce((p, c) => [p[0] + c[0], p[1] + c[1], p[1] + c[1]], [0, 0, 0]).map(e => e / (palette.length * palette.length * 256)).reduce((p, c) => p + c) * .166666656733;
    }

    function Contrast(imageData, factor) {
        
        let contrast = (factor * .01) + 1,
            intercept = 128 * (1 - contrast);
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0)
                imageData.data[i  ] = imageData.data[i  ] * contrast + intercept,
                imageData.data[i+1] = imageData.data[i+1] * contrast + intercept,
                imageData.data[i+2] = imageData.data[i+2] * contrast + intercept;
        });
        
        return imageData;
    }

    function Brightness(imageData, factor) {
        
        let brightness = (factor + 100) * .01;
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0)
                imageData.data[i  ] *= brightness,
                imageData.data[i+1] *= brightness,
                imageData.data[i+2] *= brightness;
        });
        
        return imageData;
    }

    function Threshold(fn) {
        
        console.time("Threshold");
        
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0) {
                
                let closest = fn(imageData.data[i], imageData.data[i+1], imageData.data[i+2]);
                
                imageData.data[i  ] = closest[0],
                imageData.data[i+1] = closest[1],
                imageData.data[i+2] = closest[2],
                imageData.data[i+3] = closest[3]+1 ? closest[3] : imageData.data[i+3];
            }
        });
        
        console.timeEnd("Threshold");
        
        return imageData;
    }
    
    function PaletteThreshold(palette) {
        
        console.time("PaletteThreshold");
        
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0) {
                
                let closest = nearestColor(imageData.data[i], imageData.data[i+1], imageData.data[i+2], palette);
                
                imageData.data[i  ] = closest[0],
                imageData.data[i+1] = closest[1],
                imageData.data[i+2] = closest[2],
                imageData.data[i+3] = closest[3]+1 ? closest[3] : imageData.data[i+3];
            }
        });
        
        console.timeEnd("PaletteThreshold");
        
        return imageData;
    }
    
    
//     function CharacterBrailleLike(palette) {
//         
//         console.time();
//         
//         if (typeof palette == "function") {
//             let tmp = [];
//             for (let i = 0, off=0; i < 1<<24; i++) {
//                 
//                 let rgb = palette(i >> 16 & 0xFF, i >> 8 & 0xFF, i & 0xFF);
//                 if (tmp.findIndex(clr=>clr[0]==rgb[0]&&clr[1]==rgb[1]&&clr[2]==rgb[2]) >= 0) {
//                     
//                     off++;
//                     continue;
//                 }
//                 tmp[i - off] = [],
//                 tmp[i - off][0] = rgb[0],
//                 tmp[i - off][1] = rgb[1],
//                 tmp[i - off][2] = rgb[2];
//             }
//             palette = tmp;
//         }
//         
//         palette = palette.map(e => [Math.round(e[0]), Math.round(e[1]), Math.round(e[2])]);
//         
//         console.log(palette);
//         
//         for (let y = 0; y < height; y+=4)
//             for (let x = 0; x < width; x+=2) {
//                 
//                 let pixels = [
//                     [imageData.data[(x+ y   *width)*4], imageData.data[(x+ y   *width)*4+1], imageData.data[(x+ y   *width)*4+2]], [imageData.data[(x+1+ y   *width)*4], imageData.data[(x+1+ y   *width)*4+1], imageData.data[(x+1+ y   *width)*4+2]],
//                     [imageData.data[(x+(y+1)*width)*4], imageData.data[(x+(y+1)*width)*4+1], imageData.data[(x+(y+1)*width)*4+2]], [imageData.data[(x+1+(y+1)*width)*4], imageData.data[(x+1+(y+1)*width)*4+1], imageData.data[(x+1+(y+1)*width)*4+2]],
//                     [imageData.data[(x+(y+2)*width)*4], imageData.data[(x+(y+2)*width)*4+1], imageData.data[(x+(y+2)*width)*4+2]], [imageData.data[(x+1+(y+2)*width)*4], imageData.data[(x+1+(y+2)*width)*4+1], imageData.data[(x+1+(y+2)*width)*4+2]],
//                     [imageData.data[(x+(y+3)*width)*4], imageData.data[(x+(y+3)*width)*4+1], imageData.data[(x+(y+3)*width)*4+2]], [imageData.data[(x+1+(y+3)*width)*4], imageData.data[(x+1+(y+3)*width)*4+1], imageData.data[(x+1+(y+3)*width)*4+2]],
//                 ],
//                     colorsCount = new Uint8Array(palette.length);
//                 
//                 for (let rgb of pixels)
//                     colorsCount[palette.findIndex(clr=>clr[0]==rgb[0]&&clr[1]==rgb[1]&&clr[2]==rgb[2])]++;
//                 
//                 let t = [],
//                     n = 0;
//                 colorsCount.forEach((c,i) => {
//                     
//                     if (c > 0 && n <= 8) {
//                         t.push([c, i]);
//                         n += c;
//                     }
//                 });
//                 
//                 t = t.sort((a,b)=>b[0]-a[0]);
//                 
//                 pixels = pixels.map(rgb => nearestColor(rgb[0], rgb[1], rgb[2], t.length < 2 ? [palette[t[0][1]]] : [palette[t[0][1]], palette[t[1][1]]]));
//                 
//                 for (let i = 0; i < 8; i++) {
//                     
//                     let xx = i & 1,
//                         yy = parseInt(i * .5);
//                     
//                     imageData.data[(x+xx+(y+yy)*width)*4  ] = pixels[xx+yy*2][0],
//                     imageData.data[(x+xx+(y+yy)*width)*4+1] = pixels[xx+yy*2][1],
//                     imageData.data[(x+xx+(y+yy)*width)*4+2] = pixels[xx+yy*2][2];
//                 }
//             }
//         
//         console.timeEnd();
//         
//         return imageData;
//     }
    
    
    function ImageData2Float32Array(imageData) {
        
        let result = new Array(4).fill(0).map(e=>new Float32Array(imageData.width * imageData.height));
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0)
                result[0][i * .25] = imageData.data[i  ],
                result[1][i * .25] = imageData.data[i+1],
                result[2][i * .25] = imageData.data[i+2],
                result[3][i * .25] = imageData.data[i+3];
        });
        
        return result;
    }

    function Float32Array2ImageData(a, w, h) {
        
        let imageData = context.createImageData(w, h);
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0)
                imageData.data[i  ] = a[0][i * .25],
                imageData.data[i+1] = a[1][i * .25],
                imageData.data[i+2] = a[2][i * .25],
                imageData.data[i+3] = a[3][i * .25];
        });
        
        return imageData;
    }
    
    function DCT(input, w, h, m) {
        
        let result = new Float32Array(w * h),
            temp = new Float32Array(w * h);
        
        for (let i = 0; i < w; i++)
            for (let j = 0; j < h; j++)
                for (let k = 0; k < w; k++)
                    temp[i * w + j] += (input[i * w + k] - 128) * m[1][k * w + j];
        
        for (let i = 0; i < w; i++)
            for (let j = 0; j < h; j++) {
                
                let tmp = 0;
                for (let k = 0; k < w; k++)
                    tmp += m[0][i * w + k] * temp[k * w + j];
                
                result[i * w + j] = Math.round(tmp);
            }
        
        return result;
    }

    function IDCT(input, w, h, m) {
        
        let result = new Float32Array(w * h),
            temp = new Float32Array(w * h);
        
        for (let i = 0; i < w; i++)
            for (let j = 0; j < h; j++)
                for (let k = 0; k < w; k++)
                    temp[i * w + j] += input[i * w + k] * m[0][k * w + j];
        
        for (let  i = 0; i < w; i++)
            for (let j = 0; j < h; j++) {
                
                let tmp = 0;
                for (let k = 0; k < w; k++)
                    tmp += m[1][i * w + k] * temp[k * w + j];
                
                tmp += 128;
                
                result[i * w + j] = tmp < 0 ? 0 : tmp > 255 ? 255 : Math.round(tmp)||0;
            }
        
        return result;
    }
    
    function DCTArtifact() {
        
        console.time("DCT Artifacts");
        
        let m = [[.35355339059327373,.35355339059327373,.35355339059327373,.35355339059327373,.35355339059327373,.35355339059327373,.35355339059327373,.35355339059327373,.4903926402016152,.4157348061512726,.27778511650980114,.09754516100806417,-.0975451610080641,-.277785116509801,-.4157348061512727,-.4903926402016152,.46193976625564337,.19134171618254492,-.19134171618254486,-.46193976625564337,-.4619397662556434,-.19134171618254517,.191341716182545,.46193976625564326,.4157348061512726,-.0975451610080641,-.4903926402016152,-.2777851165098011,.2777851165098009,.4903926402016152,.09754516100806439,-.41573480615127256,.3535533905932738,-.35355339059327373,-.35355339059327384,.3535533905932737,.35355339059327384,-.35355339059327334,-.35355339059327356,.3535533905932733,.27778511650980114,-.4903926402016152,.09754516100806415,.41573480615127273,-.41573480615127256,-.09754516100806401,.4903926402016153,-.27778511650980076,.19134171618254492,-.4619397662556434,.46193976625564326,-.19134171618254495,-.19134171618254528,.46193976625564337,-.4619397662556432,.19134171618254478,.09754516100806417,-.2777851165098011,.41573480615127273,-.4903926402016153,.4903926402016152,-.4157348061512725,.27778511650980076,-.09754516100806429],[.35355339059327373,.4903926402016152,.46193976625564337,.4157348061512726,.3535533905932738,.27778511650980114,.19134171618254492,.09754516100806417,.35355339059327373,.4157348061512726,.19134171618254492,-.0975451610080641,-.35355339059327373,-.4903926402016152,-.4619397662556434,-.2777851165098011,.35355339059327373,.27778511650980114,-.19134171618254486,-.4903926402016152,-.35355339059327384,.09754516100806415,.46193976625564326,.41573480615127273,.35355339059327373,.09754516100806417,-.46193976625564337,-.2777851165098011,.3535533905932737,.41573480615127273,-.19134171618254495,-.4903926402016153,.35355339059327373,-.0975451610080641,-.4619397662556434,.2777851165098009,.35355339059327384,-.41573480615127256,-.19134171618254528,.4903926402016152,.35355339059327373,-.277785116509801,-.19134171618254517,.4903926402016152,-.35355339059327334,-.09754516100806401,.46193976625564337,-.4157348061512725,.35355339059327373,-.4157348061512727,.191341716182545,.09754516100806439,-.35355339059327356,.4903926402016153,-.4619397662556432,.27778511650980076,.35355339059327373,-.4903926402016152,.46193976625564326,-.41573480615127256,.3535533905932733,-.27778511650980076,.19134171618254478,-.09754516100806429]],
            q = parseFloat(jpeg*.125),
            Q = [16, 11, 10, 16, 24, 40, 51, 61,
                12, 12, 14, 19, 26, 58, 60, 55,
                14, 13, 16, 24, 40, 57, 69, 56,
                14, 17, 22, 29, 51, 87, 80, 62,
                18, 22, 37, 56, 68, 109, 103, 77,
                24, 35, 55, 64, 81, 104, 113, 92,
                49, 64, 78, 87, 103, 121, 120, 101,
                72, 92, 95, 98, 112, 100, 103, 99].map(e=>e*q+1);
        
        for (let y = 0; y < height; y += 8)
            for (let x = 0; x < width; x += 8) {
                
                let channels = ImageData2Float32Array(context.getImageData(x, y, 8, 8)).map(chan=>IDCT(DCT(chan, 8, 8, m).map((e,i)=>Math.round(e/Q[i])||0).map((e,i)=>Math.round(e*Q[i])||0), 8, 8, m));
                context.putImageData(Float32Array2ImageData(channels, 8, 8), x, y);
            }
        
        console.timeEnd("DCT Artifacts");
    }
    
    function ErrorDiffusionDithering(dither, fn) {
        
        console.time("ErrorDiffusionDithering");
        
        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
            
                let pos = (x + y * width) * 4,
                    
                    r = imageData.data[pos  ],
                    g = imageData.data[pos+1],
                    b = imageData.data[pos+2],
                    
                    closest = fn(r, g, b),
                    
                    errR = r - closest[0],
                    errG = g - closest[1],
                    errB = b - closest[2];
                
                imageData.data[pos  ] = closest[0],
                imageData.data[pos+1] = closest[1],
                imageData.data[pos+2] = closest[2],
                imageData.data[pos+3] = closest[3]+1 ? closest[3] : imageData.data[pos+3];
                
                dither.forEach(e => {
                    
                    let pos1 = (x + e[1] + (y + e[2]) * width) * 4;
                    imageData.data[pos1  ] += parseInt(errR * e[0]),
                    imageData.data[pos1+1] += parseInt(errG * e[0]),
                    imageData.data[pos1+2] += parseInt(errB * e[0]);
                });
            }
        
        console.timeEnd("ErrorDiffusionDithering");
        
        return imageData;
    }
    
    function PaletteErrorDiffusionDithering(dither, palette) {
        
        console.time("PaletteErrorDiffusionDithering");
        
        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
            
                let pos = (x + y * width) * 4,
                    
                    r = imageData.data[pos  ],
                    g = imageData.data[pos+1],
                    b = imageData.data[pos+2],
                    
                    closest = nearestColor(r, g, b, palette),
                    
                    errR = r - closest[0],
                    errG = g - closest[1],
                    errB = b - closest[2];
                
                imageData.data[pos  ] = closest[0],
                imageData.data[pos+1] = closest[1],
                imageData.data[pos+2] = closest[2],
                imageData.data[pos+3] = closest[3]+1 ? closest[3] : imageData.data[pos+3];
                
                dither.forEach(e => {
                    
                    let pos1 = (x + e[1] + (y + e[2]) * width) * 4;
                    imageData.data[pos1  ] += parseInt(errR * e[0]),
                    imageData.data[pos1+1] += parseInt(errG * e[0]),
                    imageData.data[pos1+2] += parseInt(errB * e[0]);
                });
            }
        
        console.timeEnd("PaletteErrorDiffusionDithering");
        
        return imageData;
    }
    
    
    function MatrixDithering(matrix, mW, mH, fn) {
        
        console.time("MatrixDithering");
        
        let tmp = new Array(256).fill(0).map((_,i)=>fn(i, i, i));
        
        let r = averageColorDistance(tmp);
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0) {
                
                let x = i * .25 % width,
                    y = parseInt(i * .25 / width),
                    
                    mV = matrix[(x % mW) + (y % mH) * (mW)],
                    closest = fn(Math.min(255, imageData.data[i] + r * mV), Math.min(255, imageData.data[i+1] + r * mV), Math.min(255, imageData.data[i+2] + r * mV));
                
                imageData.data[i  ] = closest[0],
                imageData.data[i+1] = closest[1],
                imageData.data[i+2] = closest[2],
                imageData.data[i+3] = closest[3]+1 ? closest[3] : imageData.data[i+3];
            }
        });
        
        console.log(r);
        
        console.timeEnd("MatrixDithering");
        
        return imageData;
    }
    
    function PaletteMatrixDithering(matrix, mW, mH, palette) {
        
        console.time("PaletteMatrixDithering");
        
        let r = averageColorDistance(palette);
        imageData.data.forEach((_, i) => {
            
            if ((i & 3) == 0) {
                
                let x = i * .25 % width,
                    y = parseInt(i * .25 / width),
                    
                    mV = matrix[(x % mW) + (y % mH) * (mW)],
                    closest = nearestColor(imageData.data[i] + r * mV, imageData.data[i+1] + r * mV, imageData.data[i+2] + r * mV, palette);
                
                imageData.data[i  ] = closest[0],
                imageData.data[i+1] = closest[1],
                imageData.data[i+2] = closest[2],
                imageData.data[i+3] = closest[3]+1 ? closest[3] : imageData.data[i+3];
            }
        });
        
        console.timeEnd("PaletteMatrixDithering");
        
        return imageData;
    }
})();
