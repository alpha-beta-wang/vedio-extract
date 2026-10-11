"""通用 LLM API 客户端（基于 requests，兼容 OpenAI /v1/chat/completions 规范）。"""

import json
import requests

from config import (
    get_api_base_url,
    get_api_key,
    get_llm_model,
    get_llm_temperature,
    get_llm_max_tokens,
)


def create_client(api_key: str | None = None, base_url: str | None = None) -> dict:
    """创建客户端配置。返回 dict 供 chat() 使用。"""
    if api_key is None:
        api_key = get_api_key() or ""
    if base_url is None:
        base_url = get_api_base_url()
    return {"api_key": api_key, "base_url": base_url.rstrip("/")}


def chat(
    client: dict,
    system_prompt: str,
    user_message: str,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """发送聊天请求，返回模型回复文本。兼容所有标准 OpenAI 格式端点。"""
    if model is None:
        model = get_llm_model()
    if temperature is None:
        temperature = get_llm_temperature()
    if max_tokens is None:
        max_tokens = get_llm_max_tokens()

    base_url = client["base_url"].rstrip("/")
    if base_url.endswith("/chat/completions"):
        url = base_url
    elif base_url.endswith("/v1"):
        url = f"{base_url}/chat/completions"
    else:
        # 如 https://api.deepseek.com -> https://api.deepseek.com/chat/completions
        url = f"{base_url}/chat/completions"

    headers = {
        "Content-Type": "application/json",
    }
    if client.get("api_key"):
        headers["Authorization"] = f"Bearer {client['api_key']}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    # 针对 DeepSeek Reasoner 或特定推理模型适配思考参数，避免其他厂商返回 400
    model_lower = model.lower()
    if "reasoner" in model_lower or "deepseek-r1" in model_lower:
        payload["thinking"] = {"type": "enabled"}

    response = requests.post(url, headers=headers, json=payload, timeout=300)
    response.raise_for_status()

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise ValueError(f"LLM 接口未返回有效内容: {data}")
    return choices[0]["message"]["content"]
