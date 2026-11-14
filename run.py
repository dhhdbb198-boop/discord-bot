import os
try:
    import requests,colorama,prettytable
except:
    os.system("pip install requests")
    os.system("pip install colorama")
    os.system("pip install prettytable")
try:
    import bs4              
except Exception:
    os.system("pip install beautifulsoup4")
try:
    import Crypto              
except Exception:
    os.system("pip install pycryptodome")

import threading, requests, ctypes, random, json, time, base64, sys, re
from prettytable import PrettyTable
import random
from time import strftime
from colorama import init, Fore
from urllib.parse import urlparse, unquote, quote
from string import ascii_letters, digits
import urllib3

# Disable SSL verify: common on Windows Python where OpenSSL cannot find the
# local issuer (incomplete CA store / antivirus HTTPS inspection).
_SSL_VERIFY = False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

                     
from pathlib import Path
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from zefoy.captcha import ZefoyCaptcha, DEFAULT_USER_AGENT
from zefoy.fingerprint import apply_session_guard_cookies, build_captcha_encoded
from zefoy.newocr import NewOcrWeb
from zefoy.submit import is_captcha_page

os.system("cls" if os.name == "nt" else "clear")

                                                                            
DEV_NAME = "trthaodev"
DEV_TIKTOK = "@trthaoid"
DEV_YOUTUBE = "@trongthaoofficial"

def show_banner():
    print(
        f"""\033[1;36m
  ╔══════════════════════════════════════════╗
  ║            TOOL ZEFOY  ·  2026           ║
  ╠══════════════════════════════════════════╣
  ║  \033[1;37mdev     :\033[1;33m {DEV_NAME:<28}\033[1;36m║
  ║  \033[1;37mtiktok  :\033[1;32m {DEV_TIKTOK:<28}\033[1;36m║
  ║  \033[1;37myoutube :\033[1;31m {DEV_YOUTUBE:<28}\033[1;36m║
  ╚══════════════════════════════════════════╝
\033[0m"""
    )

show_banner()

class Zefoy:
    def __init__(self):
        self.base_url = 'https://zefoy.com/'
        self.headers = {'user-agent': DEFAULT_USER_AGENT}
        self.session = self._new_session()
        self.captcha_1 = None
        self.captcha_ = {}
        self.service = 'Comments Hearts'
        self.video_key = None
        self.services = {}
        self.services_ids = {}
        self.services_status = {}
        self.url = 'None'
        self.text = f'Tool Zefoy | dev: {DEV_NAME}'
        self.last_sent = 0                                              
        self.total_sent = 0                                    
        url1=input("\033[1;33m link video:  ")
      
        self.url=url1

    def _new_session(self):
        """Create a requests session with SSL configured for Windows CA issues."""
        session = requests.Session()
        session.verify = _SSL_VERIFY
        session.headers.update({
            'user-agent': DEFAULT_USER_AGENT,
            'accept-language': 'en-US,en;q=0.9',
        })
        return session

    def get_captcha(self):
\
\
\
           
        if os.path.exists('session'):
            try:
                sid = open('session', encoding='utf-8').read().strip()
                if sid:
                    self.session.cookies.set("PHPSESSID", sid, domain='zefoy.com')
            except Exception:
                pass

        request = self.session.get(self.base_url, headers=self.headers, timeout=30)

                                               
        if not is_captcha_page(request.text):
            self._extract_video_key(request.text)
            return True

                                                                   
        if 'Enter Video URL' in request.text:
            self._extract_video_key(request.text)
            return True

        try:
                                       
            apply_session_guard_cookies(self.session)
            zc = ZefoyCaptcha(
                user_agent=self.headers['user-agent'],
                session=self.session,
            )
                                                   
            captcha = zc.get(refresh_session=False)
            captcha.save('captcha.png')

                                                         
            self.captcha_1 = 'captchalogin'
            self.captcha_ = {
                'captchalogin': '',
                'captcha_encoded': build_captcha_encoded(self.headers['user-agent']),
            }
            print('Solving captcha..')
            return False
        except Exception as e:
            print(f"\033[1;33mCannot solve captcha: {e}")
            time.sleep(2)
            return self.get_captcha()

    def _extract_video_key(self, html):
                                                                       
        try:
            if 'placeholder="Enter Video URL"' in html:
                self.video_key = html.split('" placeholder="Enter Video URL"')[0].split('name="')[-1]
                return
        except Exception:
            pass
                                                   
        m = re.search(
            r'<form[^>]+action="([^"]+)"[^>]*>[\s\S]*?<input[^>]+name="([^"]+)"',
            html,
            re.I,
        )
        if m:
            self.video_key = m.group(2)
            return
        m = re.search(r'name="([0-9a-f]{8,})"', html, re.I)
        if m:
            self.video_key = m.group(1)

    def send_captcha(self, new_session = False):
        if new_session:
            self.session = self._new_session()
            self.session.headers.update({
                'user-agent': self.headers['user-agent'],
                'accept-language': 'en-US,en;q=0.9',
            })
            if os.path.exists('session'):
                os.remove('session')
            time.sleep(2)

        if self.get_captcha():
            print('\033[1;35mConnecting to session')
            return (True, 'The session already exists')

                                            
        captcha_solve = self.solve_captcha('captcha.png')[1]
        captcha_solve = re.sub(r'[^a-zA-Z]', '', captcha_solve or '').lower()
        if not captcha_solve:
            print('\033[1;31mOCR empty, retry captcha...')
            time.sleep(1)
            return self.send_captcha(new_session=False)

                                                  
        encoded = self.captcha_.get('captcha_encoded') or build_captcha_encoded(
            self.headers['user-agent']
        )
        apply_session_guard_cookies(self.session)

                                            
        request = self.session.post(
            self.base_url,
            headers={
                'user-agent': self.headers['user-agent'],
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'x-requested-with': 'XMLHttpRequest',
                'origin': 'https://zefoy.com',
                'referer': 'https://zefoy.com/',
                'accept': '*/*',
            },
            data={
                'captchalogin': captcha_solve,
                'captcha_encoded': encoded,
            },
            timeout=30,
            allow_redirects=False,
        )
        xhr_body = (request.text or '').strip()

        ok = request.status_code == 200 and xhr_body.lower() == 'success'
        if not ok:
                                                
            if not is_captcha_page(xhr_body) and len(xhr_body) > 1000:
                ok = True

        if ok:
            print('Session has been created')
            sid = self.session.cookies.get('PHPSESSID')
            if sid:
                open('session', 'w', encoding='utf-8').write(sid)
            print(f"Successfully solved captcha: {captcha_solve}")
                                                    
            panel = self.session.get(self.base_url, headers=self.headers, timeout=30)
            self._extract_video_key(panel.text)
            return (True, captcha_solve)

        time.sleep(1)
        return self.send_captcha(new_session=False)

    def solve_captcha(self, path_to_file = None, b64 = None, delete_tag = ['\n','\r']):
                                                            
        if path_to_file:
            task = path_to_file
            with open(task, 'rb') as f:
                img = f.read()
        else:
            img = base64.b64decode(b64)
            open('temp.png', 'wb').write(img)
            task = 'temp.png'

        solved_text = ''
        # 1) NewOCR (hardened SSL: verify=False + insecure adapter)
        try:
            result = NewOcrWeb().ocr(img)
            solved_text = result.text or ''
        except Exception as e:
            print(f'\033[1;33mNewOCR error: {e}')

        # 2) Local OCR only (no HTTPS) — ddddocr then RapidOCR
        if not re.sub(r'[^a-zA-Z]', '', solved_text or ''):
            from zefoy.ocr import solve_ddddocr, solve_rapidocr
            for name, fn in (('ddddocr', solve_ddddocr), ('rapidocr', solve_rapidocr)):
                try:
                    solved_text = fn(img)
                    if re.sub(r'[^a-zA-Z]', '', solved_text or ''):
                        print(f'\033[1;32mOCR via {name}: {solved_text}')
                        break
                except Exception as e:
                    print(f'\033[1;33m{name} error: {e}')
                    solved_text = ''

        for x in delete_tag:
            solved_text = solved_text.replace(x, '')
        solved_text = re.sub(r'[^a-zA-Z]', '', solved_text).lower()
        return (True, solved_text)

    def _decode_response(self, body):
                                                                                     
        if not body:
            return ''
        text = body.strip()
        if text.lower() == 'success':
            return 'success'
        rev = text[::-1]
        for candidate in (unquote(rev), rev, unquote(text), text):
            try:
                return base64.b64decode(candidate).decode('utf-8', errors='replace')
            except Exception:
                continue
        return text

    def _parse_timer(self, html):
                                                                                 
        if not html:
            return None
                                              
        m = re.search(r'remainingTimelogin\s*=\s*(-?\d+)', html)
        if m:
            v = int(m.group(1))
            return v if v > 0 else None
        m = re.search(r'var\s+ltm\s*=\s*(-?\d+)', html)
        if m:
            v = int(m.group(1))
            return v if v > 0 else None
        m = re.search(r'ltm\s*=\s*(-?\d+)', html)
        if m:
            v = int(m.group(1))
            return v if v > 0 else None
                                                             
        m = re.search(r'Please wait\s+(\d+)\s+seconds', html, re.I)
        if m:
            v = int(m.group(1))
            return v if v > 0 else None
        m = re.search(r'(\d+)\s*minute\(s\)\s*(\d+)\s*second', html, re.I)
        if m:
            v = int(m.group(1)) * 60 + int(m.group(2))
            return v if v > 0 else None
        m = re.search(r'(\d+)\s*seconds?\s*(?:for your next|before trying)', html, re.I)
        if m:
            v = int(m.group(1))
            return v if v > 0 else None
        return None

    def _wait_timer(self, seconds):
        if seconds is None or seconds <= 0:
            return
        if seconds >= 5000:
            print('\033[31mIP BLOCKED / timer quá lớn')
        end = time.time() + seconds + 1                     
        try:
            while time.time() < end:
                left = max(0, int(end - time.time()))
                print('\033[31m[Timer] chờ: \033[1;32m{0}\033[31m giây   '.format(left), end='\r')
                                                     
                for _ in range(10):
                    time.sleep(0.1)
        except KeyboardInterrupt:
            print('\n\033[1;33mStopped.\033[0m')
            raise
        print()

    def _post_service(self, fields):
                                                                             
        action = self.services_ids.get(self.service)
        if not action:
            self.get_status_services()
            action = self.services_ids.get(self.service)
        if not action:
            raise RuntimeError('Service action not found: %s' % self.service)

        token = "".join(random.choices(ascii_letters + digits, k=16))
        boundary = f'----WebKitFormBoundary{token}'
        parts = []
        for name, value in fields.items():
            parts.append(
                f'--{boundary}\r\n'
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
                f'{value}\r\n'
            )
        parts.append(f'--{boundary}--\r\n')
        body = ''.join(parts)
        url = action if str(action).startswith('http') else f'{self.base_url}{action.lstrip("/")}'
        request = self.session.post(
            url,
            headers={
                'content-type': f'multipart/form-data; boundary={boundary}',
                'user-agent': self.headers['user-agent'],
                'origin': 'https://zefoy.com',
                'referer': 'https://zefoy.com/',
                'accept': '*/*',
            },
            data=body.encode('utf-8'),
            timeout=45,
        )
        return self._decode_response(request.text)

    def _extract_confirm_fields(self, html):
                                                                                    
                                   
        m = re.search(
            r'<input[^>]+type=["\']hidden["\'][^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']+)["\']',
            html,
            re.I,
        )
        if m:
            return [m.group(1), m.group(2)]
        m = re.search(
            r'<input[^>]+name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']+)["\'][^>]*type=["\']hidden["\']',
            html,
            re.I,
        )
        if m:
            return [m.group(1), m.group(2)]
        m = re.search(
            r'<input[^>]+name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']+)["\']',
            html,
            re.I,
        )
        if m:
            name, value = m.group(1), m.group(2)
            if name.lower() not in ('submit', 'ocr', 'preview'):
                return [name, value]
                                     
        try:
            if '" name="' in html and 'value="' in html:
                return [
                    html.split('" name="')[1].split('"')[0],
                    html.split('value="')[1].split('"')[0],
                ]
        except Exception:
            pass
        return None

    def get_status_services(self):
        request = self.session.get(self.base_url, headers=self.headers, timeout=30).text
        self.services = {}
        self.services_ids = {}
        self.services_status = {}

                         
        for x in re.findall(r'<h5 class="card-title">.+</h5>\n.+\n.+', request):
            try:
                self.services[x.split('<h5 class="card-title">')[1].split('<')[0].strip()] = x.split('d-sm-inline-block">')[1].split('</small>')[0].strip()
            except Exception:
                pass
        for x in re.findall(r'<h5 class="card-title mb-3">.+</h5>\n<form action=".+">', request):
            try:
                self.services_ids[x.split('title mb-3">')[1].split('<')[0].strip()] = x.split('<form action="')[1].split('">')[0].strip()
            except Exception:
                pass
        for x in re.findall(r'<h5 class="card-title">.+</h5>\n.+<button .+', request):
            try:
                self.services_status[x.split('<h5 class="card-title">')[1].split('<')[0].strip()] = False if 'disabled class' in x else True
            except Exception:
                pass

                                                                    
        try:
            from zefoy.services import parse_services
            for svc in parse_services(request):
                                      
                self.services[svc.title] = svc.raw_status or svc.status
                self.services_status[svc.title] = bool(svc.available)
                if svc.action:
                    self.services_ids[svc.title] = svc.action
                if svc.input_name:
                                                                                  
                    self.video_key = svc.input_name
        except Exception:
            pass

                                             
        if len(self.services_ids) <= 1:
            for m in re.finditer(
                r'<form action="([^"]+)">[\s\S]*?name="([^"]+)"[^>]*placeholder="Enter Video',
                request,
                re.I,
            ):
                                
                prev = request[max(0, m.start() - 400):m.start()]
                tm = re.findall(r'<h5[^>]*>([^<]+)</h5>', prev)
                title = tm[-1].strip() if tm else m.group(1)[:12]
                self.services_ids[title] = m.group(1)
                self.video_key = m.group(2)
                if title not in self.services:
                    self.services[title] = 'unknown'
                    self.services_status[title] = True

        self._extract_video_key(request)
        return (self.services, self.services_status)

    def get_table(self, i = 1):
        table = PrettyTable(field_names=["ID", "SERVICE", "Status"], title="Status Services", header_style="upper",border=True)
        while True:
            if len(self.get_status_services()[0])>1:
                break
            else:
                print('Cant get services, retrying...');self.send_captcha();time.sleep(2)
        for service in self.services:
            status = self.services[service]
            online = ('ago updated' in status) or ('Online' in status) or (
                self.services_status.get(service) is True and 'soon' not in status.lower()
            )
            color = Fore.GREEN if online else Fore.RED
            table.add_row([f"{Fore.CYAN}{i}{Fore.RESET}", service, f"{color}{status}{Fore.RESET}"])
            i += 1
        online_n = len([x for x in self.services_status if self.services_status[x]])
        table.title = (
            f"{Fore.WHITE} Services online: {online_n} "
            f"| dev: {DEV_NAME}{Fore.RESET}"
        )
        print(table)

    def find_video(self):
                                                                                   
        if self.service is None:
            return (False, "You didn't choose the service")

        while True:
            if self.service not in self.services_ids:
                self.get_status_services()
                time.sleep(1)
                if self.service not in self.services_ids:
                    return (False, "Service action not found")

            if not self.video_key:
                self.get_status_services()
            if not self.video_key:
                return (False, "video_key not found")

            try:
                html = self._post_service({self.video_key: self.url})
            except KeyboardInterrupt:
                raise
            except Exception:
                time.sleep(3)
                continue

                     
            if 'Session expired' in html or is_captcha_page(html):
                self.send_captcha()
                continue

            if 'service is currently not working' in html.lower():
                return (False, 'The service is currently unavailable, please try again later.')

            if 'Too many requests' in html:
                time.sleep(8)
                continue

                                                                   
            wait = self._parse_timer(html)
            if wait is not None and wait > 0:
                self._wait_timer(wait)
                continue

                                                                                      
            if (
                'onsubmit="fcde' in html
                or "onsubmit='fcde" in html
                or 'onsubmit="showHideElements' in html
                or 'wbutton' in html
                or re.search(r'type=["\']hidden["\'][^>]*value=["\']\d+', html, re.I)
                or re.search(r'value=["\']\d{10,}["\']', html)
            ):
                fields = self._extract_confirm_fields(html)
                if fields:
                    self.video_info = fields                 
                    return (True, fields)
                try:
                    self.video_info = [
                        html.split('" name="')[1].split('"')[0],
                        html.split('value="')[1].split('"')[0],
                    ]
                    return (True, self.video_info)
                except Exception:
                    pass

                                                    
            if 'An error occurred' in html and not re.search(r'value=["\']\d+', html):
                return (False, 'invalid video')

            if 'Checking Timer...' in html and self._parse_timer(html):
                wait = self._parse_timer(html)
                if wait:
                    self._wait_timer(wait)
                    continue

            time.sleep(2)

    def _parse_sent_amount(self, html):
\
\
\
           
        if not html:
            return None, None, None
                                      
        m = re.search(
            r'Successfully\s+(\d+)\s*([a-zA-Z ]*?)\s*sent\.?',
            html,
            re.I,
        )
        if m:
            amount = int(m.group(1))
            kind = (m.group(2) or '').strip().lower() or 'items'
            msg = re.sub(r'\s+', ' ', m.group(0)).strip()
            return amount, kind, msg
                                         
        m = re.search(r'(\d+)\s*(views?|hearts?|likes?|shares?|followers?|favorites?)\s*sent', html, re.I)
        if m:
            return int(m.group(1)), m.group(2).lower(), m.group(0).strip()
        m = re.search(r'sent\s+(\d+)\s*(views?|hearts?|likes?)', html, re.I)
        if m:
            return int(m.group(1)), m.group(2).lower(), m.group(0).strip()
        return None, None, None

    def use_service(self):
                                                                     
        found = self.find_video()
        if not found or found[0] is False:
            return False
        if not isinstance(self.video_info, (list, tuple)) or len(self.video_info) < 2:
            return False

        try:
            res = self._post_service({self.video_info[0]: self.video_info[1]})
        except KeyboardInterrupt:
            raise
        except Exception:
            time.sleep(3)
            return ""

        if 'Session expired' in res or is_captcha_page(res):
            self.send_captcha()
            return ""
        if 'Too many requests' in res:
            time.sleep(8)
            return ""
        if 'service is currently not working' in res.lower():
            return '\033[31mThe service is currently unavailable, please try again later'

                                        
        amount, kind, sent_msg = self._parse_sent_amount(res)
        if amount is not None:
            self.last_sent = amount
            self.total_sent += amount
            print(f'\033[1;32m[+] {sent_msg}\033[0m')
            print(
                f'\033[1;32m    +{amount} {kind}  |  total: {self.total_sent}\033[0m'
            )
            wait = self._parse_timer(res)
            if wait:
                self._wait_timer(wait)
            return sent_msg

                                                             
        msg = None
        m = re.search(r"color:\s*green;?'?[^>]*>\s*([^<]+)", res, re.I)
        if m and 'Checking Timer' not in m.group(1):
            msg = m.group(1).strip()
        if not msg:
            m = re.search(
                r'<span[^>]*>([^<]*(?:Successfully|sent)[^<]*)</span>',
                res,
                re.I,
            )
            if m and 'Checking Timer' not in m.group(1):
                msg = m.group(1).strip()

        if msg:
            print(f'\033[1;32m[+] {msg}\033[0m')
            wait = self._parse_timer(res)
            if wait:
                self._wait_timer(wait)
            return msg

                                      
        wait = self._parse_timer(res)
        if wait:
            self._wait_timer(wait)
            return f'cooldown {wait}s'

        return ""

    def get_video_info(self):
        request = self.session.get(f'https://tiktok.livecounts.io/video/stats/{urlparse(self.url).path.rpartition("/")[2]}',headers={'authority':'tiktok.livecounts.io','origin':'https://livecounts.io','user-agent':self.headers['user-agent']}).json()
        if 'viewCount' in request:
            return request
        else:
            return {'viewCount':0, 'likeCount':0,'commentCount':0,'shareCount':0,'favoritesCount':0,'followersCount':0}

    def get_video_id(self, url_ = None, set_url=True):
        if url_ is None:
            url_ = self.url
        if url_[-1] == '/':
            url_ = url_[:-1]
        url = urlparse(url_).path.rpartition('/')[2]
        if url.isdigit():
            self.url = url_
            return url_
        request = requests.get(
            f'https://api.tokcount.com/?type=videoID&username=https://vm.tiktok.com/{url}',
            headers={
                'origin': 'https://tokcount.com',
                'authority': 'api.tokcount.com',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            },
            verify=_SSL_VERIFY,
            timeout=30,
        )
        if request.text == '':
            print('\033[31mVideo link is invalid')
            return False
        else:
            json_ = request.json()
        if 'author' not in json_:
            print(f'\033[31m{self.url} | Video link is invalid')
            return False
        if set_url:
            self.url = f'https://www.tiktok.com/@{json_["author"]}/video/{json_["id"]}'
            print(f'Formated video url --> {self.url}')
        return request.text

    def check_config(self):
        while True:
            try: 
                last_url = self.url
                if last_url != self.url:
                    self.get_video_id()
            except Exception as e:
                print(e)
            time.sleep(4)

    def update_name(self):
        while True:
            try:
                ctypes.windll.kernel32.SetConsoleTitleA(self.text.encode())
                video_info = self.get_video_info()
                self.text = f"Views: {video_info['viewCount']} | Hearts: {video_info['likeCount']} | Comment: {video_info['commentCount']} | Favorites: {video_info['favoritesCount']} | Followers: {video_info['followersCount']}"
            except:
                pass
            time.sleep(5)

    def select_service(self):
        while True:
            trang = "\033[1;37m"
            xanh_la = "\033[1;32m"
            xanh_duong = "\033[1;34m"
            do = "\033[1;31m"
            vang = "\033[1;33m"
            tim = "\033[1;35m"
            self.get_table()
            print(f"{xanh_la} Choose:\033[1;37m:", end=' ')
            service_id = input()
            if service_id.isdigit():
                service_id = int(service_id)
                if service_id in range(1, len(self.services) + 1):
                    services_list = list(self.services.keys())
                    self.service = services_list[service_id - 1]
                    break
                else:
                    print(f"{do}Simply Entering Numbers Is Wrong.")
            else:
                print(f"{do}Simply Entering Numbers Is Wrong.")

    def run(self):
        self.select_service()
        while True:
            try:
                out = self.use_service()
                if out is False:
                    time.sleep(5)
                elif out and 'currently unavailable' in str(out).lower():
                    time.sleep(10)
                else:
                    time.sleep(1)
            except KeyboardInterrupt:
                print('\n\033[1;33mStopped.\033[0m')
                raise SystemExit(0)
            except Exception as e:
                print(f'\033[1;31mERROR | {e}')
                time.sleep(10)

if __name__ == "__main__":
    try:
        Z = Zefoy()
                                                         
        threading.Thread(target=Z.check_config, daemon=True).start()
        threading.Thread(target=Z.update_name, daemon=True).start()
        Z.send_captcha()
        Z.run()
    except KeyboardInterrupt:
        print('\n\033[1;33mStopped.\033[0m')
        raise SystemExit(0)
