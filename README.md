# Smart Aerospace Systems Laboratory 홈페이지

한국교통대학교 항공·기계설계공학과 Smart Aerospace Systems Laboratory 홈페이지입니다.
주소: https://smart-aerospace-systems-lab.github.io

`main` 브랜치에 push하면 GitHub Actions가 사이트를 빌드해서 `gh-pages` 브랜치로 배포합니다. 1~2분 뒤 반영됩니다.

## 내용 고치는 곳

| 바꿀 내용 | 파일 |
| --- | --- |
| 연구실 이름, 이메일, 주소, 히어로 영상 | `_config.yml` |
| 연구 분야 | `_data/research.yml` |
| 연구 설비 | `_data/facilities.yml` |
| 구성원 | `_data/members.yml` (사진은 `images/members/`) |
| 논문·발표 | `_data/publications.yml` |
| 소식(News) | `_posts/YYYY-MM-DD-제목.md` 파일 추가 |
| 메뉴 | `_data/nav.yml` |

### 소식 올리기

`_posts/` 폴더에 `2026-11-20-conference.md` 같은 이름으로 파일을 만들고 아래처럼 씁니다.

```markdown
---
title: 국제학술대회 발표
image: /images/news/conference.jpg   # 없으면 빈칸
---

본문을 씁니다.
```

### 히어로 영상 넣기

영상(mp4, 10MB 이하 권장)을 `images/hero.mp4`로 올리고 `_config.yml`에서
`hero_video: /images/hero.mp4`로 바꿉니다. 영상이 없으면 풍동 유선 애니메이션이 나옵니다.

## 로컬에서 미리 보기

```bash
bundle install
bundle exec jekyll serve
```

http://localhost:4000 에서 확인합니다.
