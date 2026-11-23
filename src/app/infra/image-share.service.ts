import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import FileSaver from './file-saver-plugin';

// Width in pixels of a shared image: 1080 is the width of the images of the messaging apps and of Instagram
export const SHARE_IMAGE_WIDTH = 1080;

// PNG image drawn from a card of the app
export interface IShareImage {
	// Shown as its preview (Angular lets an image show a data URL, not a blob URL)
	dataUrl: string;
	blob: Blob;
}

export interface IShareImageMessage {
	fileName: string;
	// Subject of an email, title of the share sheet of Android
	title: string;
	// Sent with the image: caption of WhatsApp, body of an email...
	text: string;
}

// Images shared from the app: drawn from a card, then given to the share sheet of Android or of the browser, or saved
@Injectable({
	providedIn: 'root'
})
export class ImageShareService {

	// The card is drawn as laid out on the page, scaled to SHARE_IMAGE_WIDTH, always in the light theme (as the PDF).
	// A copy of it is drawn, out of the screen: the card can stay hidden. Not hidden with visibility, which html2canvas
	// copies on the SVG (the sleep curve) and draws it invisible.
	public async draw(card: HTMLElement): Promise<IShareImage> {
		// The charts (Chart.js) have just been drawn by the change detection
		await new Promise(resolve => setTimeout(resolve, 50));
		const copy = card.cloneNode(true) as HTMLElement;
		copy.classList.add('force-light-theme');
		Object.assign(copy.style, { position: 'absolute', top: '0', left: '-10000px', zIndex: '-9999' });
		// A copied canvas is empty: the charts are drawn again in it (as for the PDF report)
		const canvases = card.querySelectorAll('canvas');
		copy.querySelectorAll('canvas').forEach((canvas, i) => canvas.getContext('2d').drawImage(canvases[i], 0, 0));
		document.body.appendChild(copy);
		try {
			await Promise.all([
				(document as any).fonts?.ready,
				...Array.from(copy.querySelectorAll('img')).map(img => img.decode().catch(() => undefined))
			]);
			const canvas = await html2canvas(copy, {
				scale: SHARE_IMAGE_WIDTH / copy.offsetWidth,
				backgroundColor: '#ffffff',
				logging: false,
				scrollX: 0,
				scrollY: 0
			});
			const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
				result => result ? resolve(result) : reject(new Error('Empty image')), 'image/png'));
			return { dataUrl: canvas.toDataURL('image/png'), blob };
		} finally {
			copy.remove();
		}
	}

	// Android: the image is written in the cache of the app (shared through its FileProvider, see file_paths.xml),
	// then given to the share sheet with the text. Web: share sheet of the browser when it can share files, download
	// of the image otherwise. False when the share sheet was left without choosing an app (not an error).
	public async share(image: IShareImage, message: IShareImageMessage): Promise<boolean> {
		if (Capacitor.isNativePlatform()) {
			const uri = await this.writeInCache(image, message.fileName);
			return this.unlessCancelled(() =>
				Share.share({ title: message.title, text: message.text, files: [uri], dialogTitle: message.title }));
		}

		const nav = navigator as any;
		const file = new File([image.blob], message.fileName, { type: 'image/png' });
		if (nav.canShare && nav.canShare({ files: [file] })) {
			try {
				await nav.share({ files: [file], title: message.title, text: message.text });
			} catch (error) {
				if (error?.name === 'AbortError') {
					return false;
				}
				throw error;
			}
			return true;
		}
		saveAs(image.blob, message.fileName);
		return true;
	}

	// Android: the "Save as" of the system, where the user chooses the folder (FileSaver, as the PDF report and the
	// backups), from a copy in the cache. Web: download. False when the "Save as" was left without saving.
	public async save(image: IShareImage, fileName: string): Promise<boolean> {
		if (Capacitor.isNativePlatform()) {
			const uri = await this.writeInCache(image, fileName);
			return this.unlessCancelled(() => FileSaver.saveFile({ path: uri, filename: fileName, contentType: 'image/png' }));
		}
		saveAs(image.blob, fileName);
		return true;
	}

	private async writeInCache(image: IShareImage, fileName: string): Promise<string> {
		const written = await Filesystem.writeFile({
			path: fileName,
			data: image.dataUrl.split(',')[1],
			directory: Directory.Cache
		});
		return written.uri;
	}

	// True once done, false when the user left the sheet of the system ("Share canceled", "User cancelled")
	private async unlessCancelled(action: () => Promise<any>): Promise<boolean> {
		try {
			await action();
		} catch (error) {
			if (/cancel/i.test(error?.message || '')) {
				return false;
			}
			throw error;
		}
		return true;
	}
}
