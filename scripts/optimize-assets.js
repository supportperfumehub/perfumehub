import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Create Supabase admin client if credentials exist
let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');
} else {
    console.log('WARNING: Supabase credentials missing. Will skip database updates.');
}

const foldersToOptimize = [
    path.join(rootDir, 'src', 'assets'),
    path.join(rootDir, 'public', 'assets'),
    path.join(rootDir, 'public', 'assets', 'products'),
    path.join(rootDir, 'public', 'assets', 'shops'),
];

// File extensions to convert
const imageExtensions = ['.png', '.jpg', '.jpeg'];

async function optimizeImages() {
    const conversionMap = {}; // Maps 'old_filename' to 'new_filename' (e.g. 'logo_transparent.webp' -> 'logo_transparent.webp')
    const filePathsToDelete = [];

    console.log('Starting image conversion using Sharp...');

    for (const folder of foldersToOptimize) {
        if (!fs.existsSync(folder)) {
            console.log(`Folder does not exist: ${folder}`);
            continue;
        }

        const files = fs.readdirSync(folder);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (imageExtensions.includes(ext)) {
                const inputPath = path.join(folder, file);
                const stat = fs.statSync(inputPath);
                
                // Skip if directory
                if (stat.isDirectory()) continue;

                // Don't convert svgs or other files
                const nameWithoutExt = path.basename(file, ext);
                const outputFileName = `${nameWithoutExt}.webp`;
                const outputPath = path.join(folder, outputFileName);

                console.log(`Converting: ${file} (${(stat.size / 1024).toFixed(1)} KB)`);

                try {
                    // Convert to webp with 82 quality
                    await sharp(inputPath)
                        .webp({ quality: 82 })
                        .toFile(outputPath);

                    const newStat = fs.statSync(outputPath);
                    console.log(`Saved: ${outputFileName} (${(newStat.size / 1024).toFixed(1)} KB) - Saved: ${((1 - newStat.size / stat.size) * 100).toFixed(1)}%`);

                    conversionMap[file] = outputFileName;
                    filePathsToDelete.push(inputPath);
                } catch (error) {
                    console.error(`Failed to convert ${file}:`, error.message);
                }
            }
        }
    }

    console.log('\nImage conversion finished. Total images converted:', Object.keys(conversionMap).length);

    if (Object.keys(conversionMap).length === 0) {
        console.log('No images were converted.');
        return;
    }

    // Now search and replace in source code files
    console.log('\nUpdating references in source code...');
    const extensionsToUpdate = ['.js', '.jsx', '.css', '.html', '.json', '.cjs'];
    const directoriesToSearch = [
        path.join(rootDir, 'src'),
        path.join(rootDir, 'public'),
        path.join(rootDir, 'scripts'),
        path.join(rootDir, 'index.html'),
    ];

    function walkDir(dir, callback) {
        const stat = fs.statSync(dir);
        if (stat.isFile()) {
            const ext = path.extname(dir).toLowerCase();
            if (extensionsToUpdate.includes(ext) || dir === path.join(rootDir, 'index.html')) {
                callback(dir);
            }
            return;
        }

        if (stat.isDirectory()) {
            // Skip node_modules, .git, and dist
            const basename = path.basename(dir);
            if (['node_modules', '.git', 'dist', '.vercel'].includes(basename)) {
                return;
            }

            const list = fs.readdirSync(dir);
            list.forEach(file => {
                walkDir(path.join(dir, file), callback);
            });
        }
    }

    const filesToUpdate = [];
    for (const searchPath of directoriesToSearch) {
        if (fs.existsSync(searchPath)) {
            walkDir(searchPath, (filePath) => {
                filesToUpdate.push(filePath);
            });
        }
    }

    let totalReplacements = 0;
    for (const filePath of filesToUpdate) {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        for (const [oldName, newName] of Object.entries(conversionMap)) {
            // To be precise and avoid replacing unrelated parts, we search for oldName
            if (content.includes(oldName)) {
                // Replace oldName with newName
                content = content.split(oldName).join(newName);
                updated = true;
                totalReplacements++;
                console.log(`Replaced reference to ${oldName} -> ${newName} in ${path.relative(rootDir, filePath)}`);
            }
        }

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }

    console.log(`\nUpdated ${totalReplacements} image references in source code.`);

    // Update Supabase Database records if client is available
    if (supabase) {
        console.log('\nUpdating product image references in Supabase database...');
        try {
            // 1. Update products table
            const { data: products, error: prodError } = await supabase
                .from('products')
                .select('id, image');

            if (prodError) throw prodError;

            console.log(`Fetched ${products.length} products to check for image references.`);
            let updatedProductsCount = 0;

            for (const product of products) {
                if (!product.image) continue;
                
                let imageArray = [];
                if (typeof product.image === 'string') {
                    imageArray = [product.image];
                } else if (Array.isArray(product.image)) {
                    imageArray = product.image;
                } else {
                    try {
                        imageArray = JSON.parse(product.image);
                    } catch (e) {
                        continue;
                    }
                }

                let updatedArray = [];
                let hasChanges = false;

                for (let img of imageArray) {
                    let updatedImg = img;
                    for (const [oldName, newName] of Object.entries(conversionMap)) {
                        if (img.includes(oldName)) {
                            updatedImg = img.replace(oldName, newName);
                            hasChanges = true;
                        }
                    }
                    updatedArray.push(updatedImg);
                }

                if (hasChanges) {
                    const { error: updateError } = await supabase
                        .from('products')
                        .update({ image: updatedArray })
                        .eq('id', product.id);

                    if (updateError) {
                        console.error(`Error updating product ${product.id}:`, updateError.message);
                    } else {
                        updatedProductsCount++;
                        console.log(`Updated images for product ID: ${product.id}`);
                    }
                }
            }
            console.log(`Successfully updated ${updatedProductsCount} products in database.`);

            // 2. Update shops table logos if any
            const { data: shops, error: shopError } = await supabase
                .from('shops')
                .select('id, logo_url');

            if (shopError) throw shopError;

            let updatedShopsCount = 0;
            for (const shop of shops) {
                if (!shop.logo_url) continue;

                let updatedLogo = shop.logo_url;
                let hasChanges = false;

                for (const [oldName, newName] of Object.entries(conversionMap)) {
                    if (shop.logo_url.includes(oldName)) {
                        updatedLogo = shop.logo_url.replace(oldName, newName);
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    const { error: updateError } = await supabase
                        .from('shops')
                        .update({ logo_url: updatedLogo })
                        .eq('id', shop.id);

                    if (updateError) {
                        console.error(`Error updating shop ${shop.id}:`, updateError.message);
                    } else {
                        updatedShopsCount++;
                        console.log(`Updated logo for shop ID: ${shop.id}`);
                    }
                }
            }
            console.log(`Successfully updated ${updatedShopsCount} shops in database.`);

        } catch (dbError) {
            console.error('Error during database update:', dbError.message);
        }
    }

    // Safely delete original PNG / JPG files
    console.log('\nCleaning up original files...');
    let deletedCount = 0;
    for (const filePath of filePathsToDelete) {
        try {
            // Delete original file
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Deleted: ${path.relative(rootDir, filePath)}`);
        } catch (deleteError) {
            console.error(`Failed to delete ${filePath}:`, deleteError.message);
        }
    }
    console.log(`Cleaned up ${deletedCount} original image files.`);
    console.log('\nAsset optimization complete!');
}

optimizeImages().catch(console.error);
