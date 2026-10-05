package com.litemarket.upload;

import com.litemarket.common.ApiException;
import com.litemarket.common.Tokens;
import com.litemarket.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Saves product photos on disk under app.storage.upload-dir and serves them at /uploads/...
 * Only real JPEG, PNG, WebP and GIF files are accepted (checked by their first bytes, not the name).
 */
@Service
public class StorageService {

    public record StoredFile(byte[] bytes, String mediaType) {}

    private final Path root;

    public StorageService(AppProperties props) {
        this.root = Path.of(props.storage().uploadDir()).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a photo first.");
        byte[] head = new byte[12];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(head, 0, head.length);
        } catch (IOException e) {
            throw ApiException.badRequest("Couldn't read that file.");
        }
        String ext = imageExtension(head, read)
                .orElseThrow(() -> ApiException.badRequest("Please upload a JPG, PNG, WebP or GIF photo."));
        LocalDate today = LocalDate.now();
        String relative = today.getYear() + "/" + String.format("%02d", today.getMonthValue()) + "/"
                + Tokens.randomUrlToken(12) + "." + ext;
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) throw ApiException.badRequest("Bad file name.");
        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target);
            }
        } catch (IOException e) {
            throw ApiException.unavailable("Couldn't save the photo. Try again.");
        }
        return "/uploads/" + relative;
    }

    /** Reads an uploaded file back (used to send product photos to the AI writer). */
    public Optional<StoredFile> read(String url) {
        if (url == null || !url.startsWith("/uploads/")) return Optional.empty();
        Path p = root.resolve(url.substring("/uploads/".length())).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) return Optional.empty();
        try {
            if (Files.size(p) > 5 * 1024 * 1024) return Optional.empty();
            byte[] bytes = Files.readAllBytes(p);
            String name = p.getFileName().toString();
            String type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp"
                    : name.endsWith(".gif") ? "image/gif" : "image/jpeg";
            return Optional.of(new StoredFile(bytes, type));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    static Optional<String> imageExtension(byte[] h, int n) {
        if (n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return Optional.of("jpg");
        if (n >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G') return Optional.of("png");
        if (n >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8') return Optional.of("gif");
        if (n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return Optional.of("webp");
        return Optional.empty();
    }
}
