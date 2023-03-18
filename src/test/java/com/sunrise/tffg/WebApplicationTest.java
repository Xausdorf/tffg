package com.sunrise.tffg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.Charset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.sunrise.tffg.controllers.DonatorController;
import com.sunrise.tffg.controllers.NewsController;

@SpringBootTest
@AutoConfigureMockMvc
class WebApplicationTest {

	@Autowired
	private DonatorController donatorController;

	@Autowired
	private NewsController newsController;

	@Autowired
	private MockMvc mockMvc;

	@Test
	public void shouldGetOkStatus() throws Exception {
		this.mockMvc.perform(get("/")).andExpect(status().isOk());
		this.mockMvc.perform(get("/api/v1/donator")).andExpect(status().isOk());
		this.mockMvc.perform(get("/api/v1/news")).andExpect(status().isOk());
	}

	public static final MediaType APPLICATION_JSON_UTF8 = new MediaType(MediaType.APPLICATION_JSON.getType(),
			MediaType.APPLICATION_JSON.getSubtype(), Charset.forName("utf8"));

	@Test
	public void shouldPostOkStatus() throws Exception {

		String donatorJsonString = "{ \"id\": \"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\",\"email\": \"email@example.com\",\"name\": \"John Doe\",\"sum\": 65536,\"joinDate\": \"2007-12-12\"}";
		String newsJsonString = "{ \"id\": \"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\",\"title\": \"Something happened\",\"text\": \"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\",\"imgSrc\": \"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZNhoBCUZ2Ck0GH-MR-583QQflM6OwG0viDI92RQP5OrCLJ5Qk4Fpu9_JfY0IZLZwkHLc&usqp=CAU\",\"releaseDate\": \"2008-10-10\"}";

		this.mockMvc.perform(post("/api/v1/donator").contentType(APPLICATION_JSON_UTF8)
				.content(donatorJsonString))
				.andExpect(status().isOk());

		this.mockMvc.perform(post("/api/v1/donator").contentType(APPLICATION_JSON_UTF8)
				.content(donatorJsonString))
				.andExpect(status().isInternalServerError())
				.andExpect(result -> assertTrue(result.getResolvedException() instanceof InternalException))
				.andExpect(result -> {
					Exception resolvedException = result.getResolvedException();
					if (resolvedException != null) {
						assertEquals("email or phone taken", resolvedException.getMessage());
					}
				});

		this.mockMvc.perform(post("/api/v1/news").contentType(APPLICATION_JSON_UTF8)
				.content(newsJsonString))
				.andExpect(status().isOk());

		this.mockMvc.perform(post("/api/v1/news").contentType(APPLICATION_JSON_UTF8)
				.content(newsJsonString))
				.andExpect(status().isInternalServerError())
				.andExpect(result -> assertTrue(result.getResolvedException() instanceof InternalException))
				.andExpect(result -> {
					Exception resolvedException = result.getResolvedException();
					if (resolvedException != null) {
						assertEquals("title taken", resolvedException.getMessage());
					}
				});

	}

	@Test
	public void contextLoads() throws Exception {
		assertNotNull(donatorController);
		assertNotNull(newsController);
	}

}
