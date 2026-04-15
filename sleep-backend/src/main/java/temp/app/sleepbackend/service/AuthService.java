package temp.app.sleepbackend.service; // Поменяй на свой пакет

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import temp.app.sleepbackend.model.User;
import temp.app.sleepbackend.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void registerUser(String fullName, String email, String password) {
        // 1. Проверяем дубликаты
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email занят!");
        }

        // 2. Создаем юзера
        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);

        // 3. Шифруем пароль (обязательно!)
        user.setPasswordHash(passwordEncoder.encode(password));

        // 4. Сохраняем
        userRepository.save(user);
    }
}