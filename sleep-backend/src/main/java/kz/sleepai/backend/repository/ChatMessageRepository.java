package kz.sleepai.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import kz.sleepai.backend.model.ChatMessage;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByUser_EmailAndConversationIdOrderByTimestampAsc(String email, String conversationId);

    List<ChatMessage> findByUser_EmailOrderByTimestampDesc(String email);

    void deleteByUser_Email(String email);
}
