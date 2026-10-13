import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:iceflow_mobile/core/pagination/search_debouncer.dart';

/// Ô tìm kiếm trên đầu một danh sách: chờ người dùng ngừng gõ rồi mới gọi
/// [onSearch]; bấm nút tìm trên bàn phím thì gọi ngay.
class SearchField extends HookWidget {
  const SearchField({required this.hint, required this.onSearch, super.key});

  final String hint;
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    final debouncer = useMemoized(SearchDebouncer.new);
    useEffect(() => debouncer.dispose, const []);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: TextField(
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: hint,
          prefixIcon: const Icon(Icons.search),
          border: const OutlineInputBorder(),
          isDense: true,
        ),
        onChanged: (text) => debouncer.run(() => onSearch(text)),
        onSubmitted: onSearch,
      ),
    );
  }
}
