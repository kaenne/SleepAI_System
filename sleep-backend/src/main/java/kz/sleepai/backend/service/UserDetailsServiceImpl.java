package kz.sleepai.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import kz.sleepai.backend.model.User;
import kz.sleepai.backend.repository.UserRepository;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Ищем в базе
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Превращаем нашего User в UserDetails (понятный для Spring Security)
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                Collections.emptyList() // Ролей пока нет
        );
    }
}